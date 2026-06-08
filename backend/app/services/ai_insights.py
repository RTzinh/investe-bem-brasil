import asyncio
from textwrap import dedent
from typing import Iterable

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover - optional dependency
    genai = None

from app.core.config import Settings, get_settings


class GeminiInsightService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._model = None
        if genai and self.settings.gemini_api_key:
            genai.configure(api_key=self.settings.gemini_api_key)
            self._model = genai.GenerativeModel(self.settings.gemini_model)

    async def summarize_documents(self, texts: Iterable[str], asset_symbol: str | None = None) -> str:
        combined = "\n\n".join(texts)
        prompt = dedent(
            f"""
            You are a financial assistant that summarizes reports, material facts and news.
            Generate clear bullet points (maximum 6 items) for {asset_symbol or 'the portfolio'} covering:
            - Objective context
            - Possible impact on price, risk or cash flow
            - Quick recommendations (watch, reduce, increase, neutral)
            """
        ).strip()
        return await self._generate_response(prompt, combined)

    async def explain_alert(self, alert_payload: dict) -> str:
        prompt = dedent(
            """
            Explain in plain, transparent language why the alert below was triggered.
            Focus on:
            - The data that triggered the rule (change, volume, risk)
            - Confidence level
            - Suggested action
            """
        ).strip()
        content = f"Alert: {alert_payload.get('title')}\n\nDetails: {alert_payload}"
        return await self._generate_response(prompt, content)

    async def rebalance_recommendation(self, portfolio_snapshot: dict) -> str:
        prompt = dedent(
            """
            Suggest a rebalancing that respects:
            - Per-asset band tolerance
            - The desired risk profile (use the provided volatility or percentage risk)
            - The approximate costs and taxes provided
            """
        ).strip()
        return await self._generate_response(prompt, str(portfolio_snapshot))

    async def chat(self, messages: Iterable[object]) -> str:
        conversation = []
        snapshot_lines = []
        for message in messages:
            role = getattr(message, "role", None)
            content = getattr(message, "content", "")
            if not role or not content:
                continue
            gemini_role = "model" if role == "assistant" else "user"
            conversation.append({"role": gemini_role, "parts": [{"text": str(content)}]})
            snapshot_lines.append(f"{role}: {content}")

        if not conversation:
            return "No message received to process."

        transcript = "\n".join(snapshot_lines)

        if not self._model:
            return self._fallback("Assistant unavailable.", transcript)

        def _run() -> str:
            response = self._model.generate_content(conversation)
            if response and getattr(response, "text", None):
                return response.text.strip()
            return ""

        try:
            reply = await asyncio.to_thread(_run)
            return reply or self._fallback("Assistant unavailable.", transcript)
        except Exception:  # noqa: BLE001
            return self._fallback("Assistant unavailable.", transcript)

    async def _generate_response(self, prompt: str, content: str) -> str:
        if not self._model:
            return self._fallback(prompt, content)

        def _run() -> str:
            response = self._model.generate_content([prompt, content])
            return response.text.strip() if response and response.text else self._fallback(prompt, content)

        try:
            return await asyncio.to_thread(_run)
        except Exception:  # noqa: BLE001
            return self._fallback(prompt, content)

    def _fallback(self, prompt: str, content: str) -> str:
        key_points = content.splitlines()[:5]
        formatted = "\n".join(f"- {line}" for line in key_points if line.strip())
        return f"{prompt}\n\nApproximate summary (offline):\n{formatted}"

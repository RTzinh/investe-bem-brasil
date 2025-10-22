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
            Voce e um assistente financeiro que resume relatorios, fatos relevantes e noticias.
            Gere bullet points claros (maximo 6 itens) para {asset_symbol or 'a carteira'} contendo:
            - Contexto objetivo
            - Possivel impacto sobre preco, risco ou fluxo de caixa
            - Recomendacoes rapidas (observar, reduzir, aumentar, neutro)
            """
        ).strip()
        return await self._generate_response(prompt, combined)

    async def explain_alert(self, alert_payload: dict) -> str:
        prompt = dedent(
            """
            Explique em linguagem simples e transparente o motivo do alerta abaixo.
            Foque em:
            - Dados que acionaram a regra (variacao, volume, risco)
            - Grau de confianca
            - Acao sugerida
            """
        ).strip()
        content = f"Alerta: {alert_payload.get('title')}\n\nDetalhes: {alert_payload}"
        return await self._generate_response(prompt, content)

    async def rebalance_recommendation(self, portfolio_snapshot: dict) -> str:
        prompt = dedent(
            """
            Sugira um rebalanceamento respeitando:
            - Tolerancia de bandas por ativo
            - Perfil de risco desejado (use volatilidade ou risco percentual fornecido)
            - Custos e impostos aproximados informados
            """
        ).strip()
        return await self._generate_response(prompt, str(portfolio_snapshot))

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
        return f"{prompt}\n\nResumo aproximado (offline):\n{formatted}"

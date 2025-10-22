import asyncio
from datetime import datetime, timedelta
from typing import Iterable, Sequence

import httpx
import yfinance as yf
from sqlmodel import Session

from app.core.config import Settings, get_settings
from app.db.models import Asset, AssetClass, PriceBar
from app.repositories.assets import AssetRepository
from app.repositories.price_data import PriceDataRepository


class MarketDataService:
    def __init__(
        self,
        session: Session,
        settings: Settings | None = None,
    ) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.asset_repo = AssetRepository(session)
        self.price_repo = PriceDataRepository(session)

    async def ensure_assets(self, symbols: Iterable[str]) -> list[Asset]:
        tasks = [self._create_asset_if_needed(symbol) for symbol in symbols]
        return [asset for asset in await asyncio.gather(*tasks) if asset is not None]

    async def _create_asset_if_needed(self, symbol: str) -> Asset | None:
        existing = self.asset_repo.get_by_symbol(symbol)
        if existing:
            return existing

        info = await asyncio.to_thread(self._fetch_symbol_metadata, symbol)
        if not info:
            return None
        name = info.get("shortName") or symbol
        asset_class = self._infer_asset_class(info)
        return self.asset_repo.ensure_asset(symbol=symbol, name=name, asset_class=asset_class, currency=info.get("currency", "BRL"))

    def _fetch_symbol_metadata(self, symbol: str) -> dict:
        ticker = yf.Ticker(symbol)
        return ticker.info

    def _infer_asset_class(self, info: dict) -> AssetClass:
        industry = (info.get("industry") or "").lower()
        quote_type = (info.get("quoteType") or "").lower()
        if "etf" in quote_type:
            return AssetClass.etf
        if "reit" in quote_type or "fonds" in quote_type:
            return AssetClass.fii
        if quote_type in {"crypto", "cryptocurrency"}:
            return AssetClass.crypto
        if "bond" in quote_type or "fixed" in industry:
            return AssetClass.fixed_income
        return AssetClass.stock

    async def refresh_prices(
        self,
        symbols: Sequence[str],
        *,
        start: datetime | None = None,
        end: datetime | None = None,
        interval: str = "1d",
    ) -> dict[str, int]:
        start = start or datetime.utcnow() - timedelta(days=365)
        end = end or datetime.utcnow()
        results: dict[str, int] = {}
        for symbol in symbols:
            asset = self.asset_repo.get_by_symbol(symbol)
            if not asset:
                asset = await self._create_asset_if_needed(symbol)
                if not asset:
                    results[symbol] = 0
                    continue

            inserted = await asyncio.to_thread(
                self._download_and_store_prices,
                asset,
                start,
                end,
                interval,
            )
            results[symbol] = inserted

        return results

    def _download_and_store_prices(
        self,
        asset: Asset,
        start: datetime,
        end: datetime,
        interval: str,
    ) -> int:
        ticker = yf.Ticker(asset.symbol)
        history = ticker.history(start=start, end=end, interval=interval, auto_adjust=False)
        if history.empty:
            return 0

        bars: list[PriceBar] = []
        for timestamp, row in history.iterrows():
            ts = timestamp.to_pydatetime()
            bar = PriceBar(
                asset_id=asset.id or 0,
                timestamp=ts.replace(tzinfo=None),
                open=float(row["Open"]),
                high=float(row["High"]),
                low=float(row["Low"]),
                close=float(row["Close"]),
                volume=float(row["Volume"]) if "Volume" in row else None,
                source="yfinance",
            )
            bars.append(bar)

        return self.price_repo.add_price_bars(asset, bars)

    async def fetch_intraday_snapshot(self, symbol: str) -> dict | None:
        asset = self.asset_repo.get_by_symbol(symbol)
        if not asset:
            return None
        ticker = await asyncio.to_thread(yf.Ticker, symbol)

        def _snapshot() -> dict:
            fast_info = getattr(ticker, "fast_info", {})
            if hasattr(fast_info, "items"):
                return dict(fast_info.items())
            if isinstance(fast_info, dict):
                return fast_info
            return {}

        return await asyncio.to_thread(_snapshot)

    async def fetch_alpaca_bars(
        self,
        symbol: str,
        timeframe: str = "1Day",
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> list[dict]:
        if not self.settings.alpaca_api_key or not self.settings.alpaca_api_secret:
            raise RuntimeError("Alpaca credentials not configured")

        headers = {
            "APCA-API-KEY-ID": self.settings.alpaca_api_key,
            "APCA-API-SECRET-KEY": self.settings.alpaca_api_secret,
        }
        params = {"timeframe": timeframe}
        if start:
            params["start"] = start.isoformat()
        if end:
            params["end"] = end.isoformat()

        async with httpx.AsyncClient(base_url=self.settings.alpaca_data_endpoint, headers=headers, timeout=30) as client:
            response = await client.get(f"/stocks/{symbol}/bars", params=params)
            response.raise_for_status()
            payload = response.json()
            return payload.get("bars", [])

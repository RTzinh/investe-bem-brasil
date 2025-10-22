from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

import numpy as np
import pandas as pd
from sqlmodel import Session, select

from app.core.config import Settings, get_settings
from app.db.models import Holding, PortfolioTarget
from app.repositories.assets import AssetRepository
from app.repositories.price_data import PriceDataRepository
from app.services.analytics import AnalyticsService, AssetMetrics


@dataclass
class RebalanceAction:
    symbol: str
    current_weight: float
    target_weight: float
    deviation: float
    action: str
    trade_quantity: float
    estimated_cost: float


class PortfolioService:
    def __init__(
        self,
        session: Session,
        analytics_service: AnalyticsService,
        settings: Settings | None = None,
    ) -> None:
        self.session = session
        self.analytics = analytics_service
        self.settings = settings or get_settings()
        self.asset_repo = AssetRepository(session)
        self.price_repo = PriceDataRepository(session)

    def portfolio_snapshot(self) -> dict:
        holdings = list(self.session.exec(select(Holding)))
        assets = self.asset_repo.list_assets()
        metrics_map: dict[str, AssetMetrics] = {}
        for asset in assets:
            metrics = self.analytics.update_asset_metrics(asset)
            if metrics:
                metrics_map[asset.symbol] = metrics

        rows = []
        total_value = 0.0
        for holding in holdings:
            asset = next((a for a in assets if a.id == holding.asset_id), None)
            if not asset:
                continue
            metrics = metrics_map.get(asset.symbol)
            price = metrics.last_price if metrics else holding.current_price or holding.average_price
            position_value = holding.quantity * price
            total_value += position_value
            rows.append(
                {
                    "symbol": asset.symbol,
                    "name": asset.name,
                    "quantity": holding.quantity,
                    "price": price,
                    "value": position_value,
                    "target": self._target_weight(asset.id),
                    "metrics": metrics.__dict__ if metrics else {},
                }
            )

        for row in rows:
            row["weight"] = row["value"] / total_value if total_value else 0.0

        return {
            "total_value": total_value,
            "holdings": rows,
        }

    def _target_weight(self, asset_id: int) -> float:
        target = self.session.exec(
            select(PortfolioTarget).where(PortfolioTarget.asset_id == asset_id)
        ).first()
        return target.target_weight if target else 0.0

    def rebalance_actions(
        self,
        *,
        transaction_cost_bps: float = 10,
        min_trade_value: float = 100.0,
    ) -> list[RebalanceAction]:
        snapshot = self.portfolio_snapshot()
        holdings = snapshot["holdings"]
        total_value = snapshot["total_value"]
        actions: list[RebalanceAction] = []

        for row in holdings:
            deviation = row["weight"] - row["target"]
            tolerance = self.settings.rebalance_tolerance * row["target"] if row["target"] else 0
            if abs(deviation) <= tolerance:
                continue
            action = "sell" if deviation > 0 else "buy"
            desired_value = row["target"] * total_value
            trade_value = desired_value - row["value"]
            if abs(trade_value) < min_trade_value:
                continue
            trade_quantity = trade_value / row["price"] if row["price"] else 0
            estimated_cost = abs(trade_value) * (transaction_cost_bps / 10000)
            actions.append(
                RebalanceAction(
                    symbol=row["symbol"],
                    current_weight=row["weight"],
                    target_weight=row["target"],
                    deviation=deviation,
                    action=action,
                    trade_quantity=trade_quantity,
                    estimated_cost=estimated_cost,
                )
            )
        return actions

    def risk_budgeting_allocation(self, lookback: int = 60) -> dict:
        assets = self.asset_repo.list_assets()
        vol_map = {}
        for asset in assets:
            history = self.price_repo.get_history(asset, lookback=lookback)
            if len(history) < 2:
                continue
            frame = pd.DataFrame(
                {"close": [bar.close for bar in history]},
                index=[bar.timestamp for bar in history],
            )
            returns = frame["close"].pct_change().dropna()
            if not returns.empty:
                vol_map[asset.symbol] = returns.std()

        if not vol_map:
            return {}

        inv_vol = {symbol: 1 / vol for symbol, vol in vol_map.items() if vol > 0}
        total = sum(inv_vol.values())
        return {symbol: weight / total for symbol, weight in inv_vol.items()}

    def markowitz_allocation(self, symbols: Sequence[str], lookback: int = 252) -> dict:
        returns_matrix = []
        valid_symbols: list[str] = []
        for symbol in symbols:
            asset = self.asset_repo.get_by_symbol(symbol)
            if not asset:
                continue
            history = self.price_repo.get_history(asset, lookback=lookback)
            if len(history) < 2:
                continue
            frame = pd.DataFrame(
                {"close": [bar.close for bar in history]},
                index=[bar.timestamp for bar in history],
            )
            returns = frame["close"].pct_change().dropna()
            if returns.empty:
                continue
            returns_matrix.append(returns.values)
            valid_symbols.append(symbol)

        if len(returns_matrix) < 2:
            return {}

        aligned_returns = self._align_returns(returns_matrix)
        cov_matrix = np.cov(aligned_returns)
        ones = np.ones(len(valid_symbols))
        inv_cov = np.linalg.pinv(cov_matrix)
        weights = inv_cov @ ones
        weights /= np.sum(weights)
        return dict(zip(valid_symbols, weights))

    def _align_returns(self, returns_matrix: list[np.ndarray]) -> np.ndarray:
        min_length = min(len(arr) for arr in returns_matrix)
        trimmed = [arr[-min_length:] for arr in returns_matrix]
        return np.vstack(trimmed)


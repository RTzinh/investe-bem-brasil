from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import Iterable, Optional

import numpy as np
import pandas as pd
from sqlmodel import Session

from app.core.config import Settings, get_settings
from app.db.models import AlertSeverity, AlertType, Asset, PriceBar
from app.repositories.assets import AssetRepository
from app.repositories.price_data import PriceDataRepository


@dataclass
class AssetMetrics:
    symbol: str
    last_price: float
    daily_return: float
    volatility: float
    beta: Optional[float]
    sharpe: Optional[float]
    max_drawdown: float
    atr: Optional[float]
    volume_avg: Optional[float]
    last_volume: Optional[float]


@dataclass
class AnomalySignal:
    asset_symbol: str
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    context: dict


class AnalyticsService:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.asset_repo = AssetRepository(session)
        self.price_repo = PriceDataRepository(session)

    def _series_from_prices(self, prices: list[PriceBar]) -> pd.DataFrame:
        data = {
            "timestamp": [bar.timestamp for bar in prices],
            "close": [bar.close for bar in prices],
            "high": [bar.high for bar in prices],
            "low": [bar.low for bar in prices],
            "volume": [bar.volume for bar in prices],
        }
        frame = pd.DataFrame(data).set_index("timestamp").sort_index()
        frame["return"] = frame["close"].pct_change()
        frame["log_return"] = np.log(frame["close"]).diff()
        return frame

    def compute_metrics(self, asset: Asset, prices: list[PriceBar]) -> Optional[AssetMetrics]:
        if len(prices) < 2:
            return None

        frame = self._series_from_prices(prices)
        last_price = frame["close"].iloc[-1]
        daily_return = frame["return"].iloc[-1]
        returns = frame["return"].dropna()
        volatility = returns.std() * sqrt(252) if not returns.empty else 0.0

        drawdown = (frame["close"] / frame["close"].cummax() - 1).min()

        sharpe = None
        if volatility:
            sharpe = ((returns.mean() * 252) - self.settings.risk_free_rate) / volatility

        beta = None
        if self.settings.default_symbols and self.settings.default_symbols[0] != asset.symbol:
            benchmark_symbol = self.settings.default_symbols[0]
            benchmark_asset = self.asset_repo.get_by_symbol(benchmark_symbol)
            if benchmark_asset:
                benchmark_prices = self.price_repo.get_history(benchmark_asset)
                if benchmark_prices:
                    benchmark_frame = self._series_from_prices(benchmark_prices)
                    joined = frame.join(
                        benchmark_frame[["return"]],
                        how="inner",
                        lsuffix="",
                        rsuffix="_benchmark",
                    ).dropna()
                    if not joined.empty:
                        cov = np.cov(joined["return"], joined["return_benchmark"])
                        benchmark_var = np.var(joined["return_benchmark"])
                        if benchmark_var:
                            beta = cov[0][1] / benchmark_var

        atr = None
        if len(frame) >= 14:
            tr1 = frame["high"] - frame["low"]
            tr2 = (frame["high"] - frame["close"].shift()).abs()
            tr3 = (frame["low"] - frame["close"].shift()).abs()
            true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            atr = true_range.rolling(window=14).mean().iloc[-1]

        volume_avg = frame["volume"].tail(20).mean() if "volume" in frame else None
        last_volume = frame["volume"].iloc[-1] if "volume" in frame else None

        return AssetMetrics(
            symbol=asset.symbol,
            last_price=last_price,
            daily_return=daily_return,
            volatility=volatility or 0.0,
            beta=beta,
            sharpe=sharpe,
            max_drawdown=abs(drawdown) if pd.notna(drawdown) else 0.0,
            atr=atr,
            volume_avg=volume_avg,
            last_volume=last_volume,
        )

    def update_asset_metrics(self, asset: Asset) -> Optional[AssetMetrics]:
        prices = self.price_repo.get_history(asset, lookback=252)
        metrics = self.compute_metrics(asset, prices)
        if not metrics:
            return None

        asset.sharpe = metrics.sharpe
        asset.beta = metrics.beta
        asset.drawdown = metrics.max_drawdown
        asset.volatility = metrics.volatility
        self.session.add(asset)
        self.session.commit()
        return metrics

    def detect_anomalies(self, assets: Iterable[Asset]) -> list[AnomalySignal]:
        signals: list[AnomalySignal] = []
        for asset in assets:
            prices = self.price_repo.get_history(asset, lookback=60)
            if len(prices) < 5:
                continue
            frame = self._series_from_prices(prices)
            latest_return_pct = frame["return"].iloc[-1] * 100
            if abs(latest_return_pct) >= self.settings.anomaly_threshold_pct:
                severity = (
                    AlertSeverity.critical
                    if abs(latest_return_pct) >= self.settings.anomaly_threshold_pct * 2
                    else AlertSeverity.warning
                )
                signals.append(
                    AnomalySignal(
                        asset_symbol=asset.symbol,
                        alert_type=AlertType.price_move,
                        severity=severity,
                        title=f"{latest_return_pct:.2f}% change in {asset.symbol}",
                        message=f"The asset {asset.symbol} moved {latest_return_pct:.2f}% in the last trading session.",
                        context={
                            "return_pct": latest_return_pct,
                            "threshold_pct": self.settings.anomaly_threshold_pct,
                        },
                    )
                )

            atr_series = frame["close"].rolling(14).apply(lambda col: col.max() - col.min())
            atr = atr_series.iloc[-1] if not atr_series.empty else None
            mean_20 = frame["close"].rolling(20).mean().iloc[-1] if frame["close"].rolling(20).mean().notna().any() else None
            if (
                atr
                and not pd.isna(atr)
                and mean_20
                and frame["close"].iloc[-1] > mean_20 + atr * self.settings.atr_breakout_multiplier
            ):
                signals.append(
                    AnomalySignal(
                        asset_symbol=asset.symbol,
                        alert_type=AlertType.anomaly,
                        severity=AlertSeverity.info,
                        title=f"ATR breakout in {asset.symbol}",
                        message=f"{asset.symbol} broke through the ATR-based price level.",
                        context={"atr": atr, "close": frame['close'].iloc[-1]},
                    )
                )

            if frame["volume"].notna().any() and frame["volume"].iloc[-1]:
                volume_avg_series = frame["volume"].rolling(20).mean()
                avg_volume = volume_avg_series.iloc[-1] if not volume_avg_series.empty else None
                if (
                    avg_volume
                    and not pd.isna(avg_volume)
                    and frame["volume"].iloc[-1] >= avg_volume * self.settings.volume_spike_multiplier
                ):
                    signals.append(
                        AnomalySignal(
                            asset_symbol=asset.symbol,
                            alert_type=AlertType.volatility,
                            severity=AlertSeverity.warning,
                            title=f"Abnormal volume in {asset.symbol}",
                            message=f"Traded volume was {frame['volume'].iloc[-1]:.0f}, above {self.settings.volume_spike_multiplier:.1f}x the average.",
                            context={
                                "volume": frame["volume"].iloc[-1],
                                "volume_avg": avg_volume,
                                "multiplier": self.settings.volume_spike_multiplier,
                            },
                        )
                    )

        return signals

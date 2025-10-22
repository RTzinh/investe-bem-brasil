from typing import Optional

from pydantic import BaseModel


class AssetAnalyticsResponse(BaseModel):
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


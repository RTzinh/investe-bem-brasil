from typing import Optional

from pydantic import BaseModel

from app.db.models import AssetClass


class AssetMetricsSchema(BaseModel):
    last_price: float
    daily_return: float
    volatility: float
    beta: Optional[float]
    sharpe: Optional[float]
    max_drawdown: float
    atr: Optional[float]
    volume_avg: Optional[float]
    last_volume: Optional[float]


class AssetSchema(BaseModel):
    symbol: str
    name: str
    asset_class: AssetClass
    currency: str
    benchmark_symbol: Optional[str] = None
    sharpe: Optional[float] = None
    beta: Optional[float] = None
    drawdown: Optional[float] = None
    volatility: Optional[float] = None
    metrics: Optional[AssetMetricsSchema] = None

    class Config:
        from_attributes = True


class AssetCreateSchema(BaseModel):
    symbol: str
    name: str
    asset_class: AssetClass
    currency: str = "BRL"
    target_weight: Optional[float] = None
    target_tolerance: float = 0.2


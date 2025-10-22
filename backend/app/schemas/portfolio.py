from typing import Optional

from pydantic import BaseModel


class HoldingSnapshot(BaseModel):
    symbol: str
    name: str
    quantity: float
    price: float
    value: float
    weight: float
    target: float
    metrics: dict


class PortfolioSnapshot(BaseModel):
    total_value: float
    holdings: list[HoldingSnapshot]


class RebalanceActionSchema(BaseModel):
    symbol: str
    current_weight: float
    target_weight: float
    deviation: float
    action: str
    trade_quantity: float
    estimated_cost: float


class RebalanceRequestSchema(BaseModel):
    transaction_cost_bps: Optional[float] = 10
    min_trade_value: Optional[float] = 100.0


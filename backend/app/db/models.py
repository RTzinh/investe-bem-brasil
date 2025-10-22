from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlalchemy.dialects.sqlite import JSON
from sqlmodel import Column, Field, Relationship, SQLModel


class AssetClass(str, Enum):
    stock = "stock"
    etf = "etf"
    fii = "fii"
    crypto = "crypto"
    fixed_income = "fixed_income"
    other = "other"


class AlertType(str, Enum):
    price_move = "price_move"
    volatility = "volatility"
    news = "news"
    fundamental = "fundamental"
    rebalance = "rebalance"
    anomaly = "anomaly"
    report = "report"


class AlertSeverity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class AssetBase(SQLModel):
    symbol: str = Field(index=True)
    name: str
    asset_class: AssetClass = Field(default=AssetClass.other, index=True)
    currency: str = Field(default="BRL", max_length=8)
    benchmark_symbol: Optional[str] = Field(default=None)


class Asset(AssetBase, table=True):
    __tablename__ = "assets"

    id: Optional[int] = Field(default=None, primary_key=True)
    volatility: Optional[float] = Field(default=None)
    beta: Optional[float] = Field(default=None)
    sharpe: Optional[float] = Field(default=None)
    drawdown: Optional[float] = Field(default=None)

    prices: list["PriceBar"] = Relationship(back_populates="asset")
    targets: list["PortfolioTarget"] = Relationship(back_populates="asset")
    holdings: list["Holding"] = Relationship(back_populates="asset")


class PriceBar(SQLModel, table=True):
    __tablename__ = "price_bars"
    __table_args__ = (UniqueConstraint("asset_id", "timestamp", name="uq_price_asset_ts"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_id: int = Field(foreign_key="assets.id", index=True)
    timestamp: datetime = Field(index=True)
    open: float
    high: float
    low: float
    close: float
    volume: Optional[float] = Field(default=None)
    source: Optional[str] = Field(default=None)

    asset: Optional[Asset] = Relationship(back_populates="prices")


class CorporateAction(SQLModel, table=True):
    __tablename__ = "corporate_actions"

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_id: int = Field(foreign_key="assets.id", index=True)
    action_type: str = Field(description="dividend, split, etc.")
    amount: float = Field(default=0.0)
    record_date: datetime
    payable_date: Optional[datetime] = None
    notes: Optional[str] = None


class Holding(SQLModel, table=True):
    __tablename__ = "holdings"

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_id: int = Field(foreign_key="assets.id", index=True)
    quantity: float = Field(default=0)
    average_price: float = Field(default=0.0)
    current_price: Optional[float] = Field(default=None)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    asset: Optional[Asset] = Relationship(back_populates="holdings")


class PortfolioTarget(SQLModel, table=True):
    __tablename__ = "portfolio_targets"

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_id: int = Field(foreign_key="assets.id", index=True)
    target_weight: float = Field(default=0.0)
    lower_band: float = Field(default=0.0)
    upper_band: float = Field(default=0.0)
    risk_budget: Optional[float] = Field(default=None)

    asset: Optional[Asset] = Relationship(back_populates="targets")


class NewsItem(SQLModel, table=True):
    __tablename__ = "news"

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_symbol: Optional[str] = Field(default=None, index=True)
    headline: str
    url: Optional[str] = Field(default=None)
    published_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    summary: Optional[str] = Field(default=None)
    sentiment: Optional[float] = Field(default=None)
    source: Optional[str] = Field(default=None)


class Insight(SQLModel, table=True):
    __tablename__ = "insights"

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_symbol: Optional[str] = Field(default=None, index=True)
    title: str
    summary: str
    rationale: Optional[str] = Field(default=None)
    impact: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    raw_context: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class Alert(SQLModel, table=True):
    __tablename__ = "alerts"

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_symbol: Optional[str] = Field(default=None, index=True)
    alert_type: AlertType = Field(index=True)
    severity: AlertSeverity = Field(default=AlertSeverity.info)
    title: str
    message: str
    triggered_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    context: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    acknowledged: bool = Field(default=False)

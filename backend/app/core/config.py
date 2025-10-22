from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    app_name: str = Field(default="Investe Bem Brasil API", alias="APP_NAME")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    version: str = Field(default="0.1.0", alias="APP_VERSION")
    debug: bool = Field(default=False, alias="DEBUG")

    database_url: str = Field(
        default=f"sqlite:///{Path(__file__).resolve().parents[1] / 'db' / 'investebem.db'}",
        alias="DATABASE_URL",
    )

    alpaca_api_key: Optional[str] = Field(default=None, alias="ALPACA_API_KEY")
    alpaca_api_secret: Optional[str] = Field(default=None, alias="ALPACA_API_SECRET")
    alpaca_data_endpoint: str = Field(
        default="https://data.alpaca.markets/v2",
        alias="ALPACA_DATA_ENDPOINT",
    )

    gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="models/gemini-1.5-flash", alias="GEMINI_MODEL")

    default_symbols: List[str] = Field(
        default=["PETR4.SA", "VALE3.SA", "IVVB11.SA", "BTC-USD"],
        alias="DEFAULT_SYMBOLS",
    )

    anomaly_threshold_pct: float = Field(default=3.0, alias="ANOMALY_THRESHOLD_PCT")
    atr_breakout_multiplier: float = Field(default=1.5, alias="ATR_BREAKOUT_MULTIPLIER")
    volume_spike_multiplier: float = Field(default=2.0, alias="VOLUME_SPIKE_MULTIPLIER")

    rebalance_tolerance: float = Field(default=0.2, alias="REBALANCE_TOLERANCE")
    risk_free_rate: float = Field(default=0.035, alias="RISK_FREE_RATE")

    email_from: Optional[str] = Field(default=None, alias="ALERT_EMAIL_FROM")
    email_recipients: List[str] = Field(default_factory=list, alias="ALERT_EMAIL_RECIPIENTS")

    scheduler_tick_seconds: int = Field(default=300, alias="SCHEDULER_TICK_SECONDS")

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", ".env.development"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("default_symbols", mode="before")
    @classmethod
    def _split_symbols(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [symbol.strip() for symbol in value.split(",") if symbol.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()

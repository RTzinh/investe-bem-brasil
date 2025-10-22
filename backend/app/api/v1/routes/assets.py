import asyncio
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.db.models import Asset
from app.db.session import get_session
from app.repositories.assets import AssetRepository
from app.repositories.price_data import PriceDataRepository
from app.schemas.asset import AssetCreateSchema, AssetMetricsSchema, AssetSchema
from app.services.analytics import AnalyticsService
from app.services.market_data import MarketDataService

router = APIRouter()


@router.get("/", response_model=List[AssetSchema])
async def list_assets(session: Session = Depends(get_session)) -> list[AssetSchema]:
    repo = AssetRepository(session)
    analytics = AnalyticsService(session)
    assets = repo.list_assets()
    response: list[AssetSchema] = []
    for asset in assets:
        metrics = await asyncio.to_thread(analytics.update_asset_metrics, asset)
        asset_schema = AssetSchema.model_validate(asset)
        if metrics:
            asset_schema.metrics = AssetMetricsSchema(**metrics.__dict__)
        response.append(asset_schema)
    return response


@router.post("/", response_model=AssetSchema, status_code=201)
async def create_asset(payload: AssetCreateSchema, session: Session = Depends(get_session)) -> AssetSchema:
    repo = AssetRepository(session)
    asset = repo.ensure_asset(
        symbol=payload.symbol,
        name=payload.name,
        asset_class=payload.asset_class,
        currency=payload.currency,
    )
    if payload.target_weight is not None:
        repo.upsert_targets(asset, payload.target_weight, payload.target_tolerance)

    analytics = AnalyticsService(session)
    metrics = await asyncio.to_thread(analytics.update_asset_metrics, asset)
    asset_schema = AssetSchema.model_validate(asset)
    if metrics:
        asset_schema.metrics = AssetMetricsSchema(**metrics.__dict__)
    return asset_schema


@router.get("/{symbol}/prices")
async def get_price_history(
    symbol: str,
    session: Session = Depends(get_session),
    lookback: int = Query(default=120, le=1000),
) -> dict:
    repo = AssetRepository(session)
    asset = repo.get_by_symbol(symbol)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    price_repo = PriceDataRepository(session)
    history = price_repo.get_history(asset, lookback=lookback)
    return {
        "symbol": symbol,
        "prices": [
            {
                "timestamp": bar.timestamp.isoformat(),
                "open": bar.open,
                "high": bar.high,
                "low": bar.low,
                "close": bar.close,
                "volume": bar.volume,
            }
            for bar in history
        ],
    }


@router.post("/{symbol}/refresh")
async def refresh_asset_prices(
    symbol: str,
    session: Session = Depends(get_session),
    days: int = Query(default=180),
) -> dict:
    repo = AssetRepository(session)
    asset = repo.get_by_symbol(symbol)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    market_data = MarketDataService(session)
    result = await market_data.refresh_prices(
        [symbol],
        start=datetime.utcnow() - timedelta(days=days),
        end=datetime.utcnow(),
    )
    return {"symbol": symbol, "inserted": result.get(symbol, 0)}

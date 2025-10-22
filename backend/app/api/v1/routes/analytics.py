import asyncio
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.db.session import get_session
from app.repositories.assets import AssetRepository
from app.schemas.analytics import AssetAnalyticsResponse
from app.services.analytics import AnalyticsService

router = APIRouter()


@router.get("/assets", response_model=List[AssetAnalyticsResponse])
async def get_asset_metrics(
    session: Session = Depends(get_session),
    symbols: Optional[List[str]] = Query(default=None),
) -> list[AssetAnalyticsResponse]:
    repo = AssetRepository(session)
    analytics = AnalyticsService(session)
    assets = repo.list_assets()
    if symbols:
        assets = [asset for asset in assets if asset.symbol in symbols]

    responses: list[AssetAnalyticsResponse] = []
    for asset in assets:
        metrics = await asyncio.to_thread(analytics.update_asset_metrics, asset)
        if not metrics:
            continue
        responses.append(AssetAnalyticsResponse(**metrics.__dict__))
    return responses

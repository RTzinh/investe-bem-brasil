import asyncio

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.portfolio import (
    PortfolioSnapshot,
    RebalanceActionSchema,
    RebalanceRequestSchema,
)
from app.services.analytics import AnalyticsService
from app.services.portfolio import PortfolioService

router = APIRouter()


@router.get("/snapshot", response_model=PortfolioSnapshot)
async def get_portfolio_snapshot(session: Session = Depends(get_session)) -> PortfolioSnapshot:
    analytics = AnalyticsService(session)
    service = PortfolioService(session, analytics)
    snapshot = await asyncio.to_thread(service.portfolio_snapshot)
    return PortfolioSnapshot(**snapshot)


@router.post("/rebalance", response_model=list[RebalanceActionSchema])
async def suggest_rebalance(
    payload: RebalanceRequestSchema,
    session: Session = Depends(get_session),
) -> list[RebalanceActionSchema]:
    analytics = AnalyticsService(session)
    service = PortfolioService(session, analytics)
    actions = await asyncio.to_thread(
        service.rebalance_actions,
        transaction_cost_bps=payload.transaction_cost_bps or 10,
        min_trade_value=payload.min_trade_value or 100.0,
    )
    return [RebalanceActionSchema(**action.__dict__) for action in actions]

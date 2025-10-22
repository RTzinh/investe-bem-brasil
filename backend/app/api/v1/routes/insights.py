from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.config import get_settings
from app.db.session import get_session
from app.repositories.insights import InsightRepository
from app.schemas.insight import InsightCreateSchema, InsightSchema
from app.services.ai_insights import GeminiInsightService

router = APIRouter()


@router.get("/", response_model=list[InsightSchema])
async def list_insights(session: Session = Depends(get_session)) -> list[InsightSchema]:
    repo = InsightRepository(session)
    insights = repo.list_insights()
    return [InsightSchema.model_validate(insight) for insight in insights]


@router.post("/", response_model=InsightSchema, status_code=201)
async def create_insight(
    payload: InsightCreateSchema,
    session: Session = Depends(get_session),
) -> InsightSchema:
    settings = get_settings()
    ai_service = GeminiInsightService(settings)
    summary = await ai_service.summarize_documents(payload.documents, payload.asset_symbol)
    repo = InsightRepository(session)
    insight = repo.create_insight(
        asset_symbol=payload.asset_symbol,
        title=f"Insight para {payload.asset_symbol or 'carteira'}",
        summary=summary,
        rationale=None,
        impact=None,
        raw_context={"documents": payload.documents},
    )
    return InsightSchema.model_validate(insight)


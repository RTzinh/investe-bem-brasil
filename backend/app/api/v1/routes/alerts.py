from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.core.config import get_settings
from app.db.session import get_session
from app.repositories.alerts import AlertRepository
from app.schemas.alert import AlertAcknowledgeSchema, AlertSchema
from app.services.ai_insights import GeminiInsightService

router = APIRouter()


@router.get("/", response_model=list[AlertSchema])
async def list_alerts(session: Session = Depends(get_session)) -> list[AlertSchema]:
    repo = AlertRepository(session)
    alerts = repo.recent_alerts()
    return [AlertSchema.model_validate(alert) for alert in alerts]


@router.post("/{alert_id}/ack", response_model=AlertSchema)
async def acknowledge_alert(
    alert_id: int,
    payload: AlertAcknowledgeSchema,
    session: Session = Depends(get_session),
) -> AlertSchema:
    repo = AlertRepository(session)
    alert = repo.mark_acknowledged(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return AlertSchema.model_validate(alert)


@router.get("/{alert_id}/explanation")
async def alert_explanation(
    alert_id: int,
    session: Session = Depends(get_session),
) -> dict:
    repo = AlertRepository(session)
    alert = repo.get(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    settings = get_settings()
    ai_service = GeminiInsightService(settings)
    explanation = await ai_service.explain_alert(AlertSchema.model_validate(alert).model_dump())
    return {"alert_id": alert_id, "explanation": explanation}

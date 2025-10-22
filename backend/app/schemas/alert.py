from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.db.models import AlertSeverity, AlertType


class AlertSchema(BaseModel):
    id: int
    asset_symbol: Optional[str]
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    triggered_at: datetime
    context: Optional[dict]
    acknowledged: bool

    class Config:
        from_attributes = True


class AlertAcknowledgeSchema(BaseModel):
    acknowledged: bool = True

from typing import Iterable, Optional

from sqlmodel import Session, select

from app.db.models import Alert, AlertSeverity, AlertType


class AlertRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def recent_alerts(self, limit: int = 50) -> list[Alert]:
        return list(
            self.session.exec(
                select(Alert).order_by(Alert.triggered_at.desc()).limit(limit)
            )
        )

    def create_alert(
        self,
        *,
        asset_symbol: str | None,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        context: dict | None = None,
    ) -> Alert:
        alert = Alert(
            asset_symbol=asset_symbol,
            alert_type=alert_type,
            severity=severity,
            title=title,
            message=message,
            context=context,
        )
        self.session.add(alert)
        self.session.commit()
        self.session.refresh(alert)
        return alert

    def get(self, alert_id: int) -> Optional[Alert]:
        return self.session.get(Alert, alert_id)

    def mark_acknowledged(self, alert_id: int) -> Optional[Alert]:
        alert = self.session.get(Alert, alert_id)
        if not alert:
            return None
        alert.acknowledged = True
        self.session.add(alert)
        self.session.commit()
        self.session.refresh(alert)
        return alert

    def bulk_insert(self, alerts: Iterable[Alert]) -> int:
        count = 0
        for alert in alerts:
            self.session.add(alert)
            count += 1
        self.session.commit()
        return count

from email.message import EmailMessage

try:
    import aiosmtplib
except ImportError:  # pragma: no cover
    aiosmtplib = None

from app.core.config import Settings, get_settings
from app.db.models import Alert, AlertSeverity, AlertType
from app.repositories.alerts import AlertRepository
from app.repositories.assets import AssetRepository
from app.services.ai_insights import GeminiInsightService
from app.services.analytics import AnalyticsService


class AlertService:
    def __init__(
        self,
        alert_repo: AlertRepository,
        asset_repo: AssetRepository,
        analytics_service: AnalyticsService,
        ai_service: GeminiInsightService,
        settings: Settings | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.alert_repo = alert_repo
        self.asset_repo = asset_repo
        self.analytics = analytics_service
        self.ai = ai_service

    async def evaluate(self) -> list[Alert]:
        assets = self.asset_repo.list_assets()
        signals = self.analytics.detect_anomalies(assets)
        alerts: list[Alert] = []

        for signal in signals:
            alert = self.alert_repo.create_alert(
                asset_symbol=signal.asset_symbol,
                alert_type=signal.alert_type,
                severity=signal.severity,
                title=signal.title,
                message=signal.message,
                context=signal.context,
            )
            alerts.append(alert)
            await self._notify(alert)
        return alerts

    async def explain_alert(self, alert: Alert) -> str:
        return await self.ai.explain_alert(
            {
                "title": alert.title,
                "message": alert.message,
                "context": alert.context,
                "severity": alert.severity.value,
                "type": alert.alert_type.value,
            }
        )

    async def _notify(self, alert: Alert) -> None:
        if not self.settings.email_recipients or not self.settings.email_from:
            return

        explanation = await self.explain_alert(alert)
        if not aiosmtplib:
            return

        message = EmailMessage()
        message["From"] = self.settings.email_from
        message["To"] = ", ".join(self.settings.email_recipients)
        message["Subject"] = f"[Investe Bem] {alert.title}"
        message.set_content(f"{alert.message}\n\n{explanation}")

        try:
            await aiosmtplib.send(message)  # relies on local SMTP config
        except Exception:  # noqa: BLE001
            # Fallback: log or ignore for now
            pass

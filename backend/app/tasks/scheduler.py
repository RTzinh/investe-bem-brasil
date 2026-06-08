import asyncio
from contextlib import suppress

from sqlmodel import Session

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.db.models import AlertSeverity, AlertType
from app.db.session import engine
from app.repositories.alerts import AlertRepository
from app.repositories.assets import AssetRepository
from app.services.ai_insights import GeminiInsightService
from app.services.alerts import AlertService
from app.services.analytics import AnalyticsService
from app.services.market_data import MarketDataService
from app.services.portfolio import PortfolioService

logger = get_logger(__name__)


class Scheduler:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._tasks: list[asyncio.Task] = []
        self._stop_event = asyncio.Event()
        self.ai_service = GeminiInsightService(self.settings)

    async def start(self) -> None:
        if self._tasks:
            return
        self._stop_event.clear()
        self._tasks.append(asyncio.create_task(self._market_data_job()))
        self._tasks.append(asyncio.create_task(self._rebalance_job()))
        logger.info("Scheduler started with %s tasks", len(self._tasks))

    async def stop(self) -> None:
        self._stop_event.set()
        for task in self._tasks:
            task.cancel()
        for task in self._tasks:
            with suppress(asyncio.CancelledError):
                await task
        self._tasks.clear()
        logger.info("Scheduler stopped")

    async def _market_data_job(self) -> None:
        while not self._stop_event.is_set():
            logger.debug("Running market data job")
            try:
                with Session(engine) as session:
                    market_data = MarketDataService(session, self.settings)
                    await market_data.ensure_assets(self.settings.default_symbols)
                    await market_data.refresh_prices(
                        self.settings.default_symbols,
                        interval="1d",
                    )

                    analytics = AnalyticsService(session, self.settings)
                    asset_repo = AssetRepository(session)
                    assets = asset_repo.list_assets()
                    for asset in assets:
                        analytics.update_asset_metrics(asset)

                    alert_service = AlertService(
                        AlertRepository(session),
                        asset_repo,
                        analytics,
                        self.ai_service,
                        self.settings,
                    )
                    await alert_service.evaluate()
            except Exception as exc:  # noqa: BLE001
                logger.exception("Error in market data job: %s", exc)

            try:
                await asyncio.wait_for(
                    self._stop_event.wait(),
                    timeout=self.settings.scheduler_tick_seconds,
                )
            except asyncio.TimeoutError:
                continue

    async def _rebalance_job(self) -> None:
        while not self._stop_event.is_set():
            logger.debug("Running rebalance job")
            try:
                with Session(engine) as session:
                    analytics = AnalyticsService(session, self.settings)
                    portfolio_service = PortfolioService(session, analytics, self.settings)
                    actions = portfolio_service.rebalance_actions()
                    if not actions:
                        await asyncio.wait_for(
                            self._stop_event.wait(),
                            timeout=self.settings.scheduler_tick_seconds * 2,
                        )
                        continue

                    alert_repo = AlertRepository(session)
                    for action in actions:
                        alert_repo.create_alert(
                            asset_symbol=action.symbol,
                            alert_type=AlertType.rebalance,
                            severity=AlertSeverity.info,
                            title=f"Suggest {action.action.upper()} of {action.symbol}",
                            message=(
                                f"Current weight {action.current_weight:.2%} vs target {action.target_weight:.2%}. "
                                f"Suggested quantity: {action.trade_quantity:.2f} ({action.estimated_cost:.2f} in costs)."
                            ),
                            context={
                                "action": action.action,
                                "trade_quantity": action.trade_quantity,
                                "estimated_cost": action.estimated_cost,
                            },
                        )
            except Exception as exc:  # noqa: BLE001
                logger.exception("Error in rebalance job: %s", exc)

            try:
                await asyncio.wait_for(
                    self._stop_event.wait(),
                    timeout=self.settings.scheduler_tick_seconds * 3,
                )
            except asyncio.TimeoutError:
                continue

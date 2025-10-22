from sqlmodel import Session, select

from app.db.models import Insight


class InsightRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_insights(self, limit: int = 20) -> list[Insight]:
        return list(
            self.session.exec(
                select(Insight).order_by(Insight.created_at.desc()).limit(limit)
            )
        )

    def create_insight(
        self,
        *,
        asset_symbol: str | None,
        title: str,
        summary: str,
        rationale: str | None = None,
        impact: str | None = None,
        raw_context: dict | None = None,
    ) -> Insight:
        insight = Insight(
            asset_symbol=asset_symbol,
            title=title,
            summary=summary,
            rationale=rationale,
            impact=impact,
            raw_context=raw_context,
        )
        self.session.add(insight)
        self.session.commit()
        self.session.refresh(insight)
        return insight


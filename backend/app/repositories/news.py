from typing import Optional

from sqlmodel import Session, select

from app.db.models import NewsItem


class NewsRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_news(self, limit: int = 50) -> list[NewsItem]:
        return list(
            self.session.exec(
                select(NewsItem).order_by(NewsItem.published_at.desc()).limit(limit)
            )
        )

    def upsert_news(
        self,
        *,
        headline: str,
        url: str | None,
        asset_symbol: str | None,
        summary: str | None,
        sentiment: float | None,
        source: str | None,
        published_at,
    ) -> NewsItem:
        existing = self.session.exec(
            select(NewsItem).where(NewsItem.headline == headline)
        ).first()
        if existing:
            existing.summary = summary
            existing.sentiment = sentiment
            existing.source = source
            existing.asset_symbol = asset_symbol
            existing.url = url
            self.session.commit()
            self.session.refresh(existing)
            return existing

        news = NewsItem(
            headline=headline,
            url=url,
            asset_symbol=asset_symbol,
            summary=summary,
            sentiment=sentiment,
            source=source,
            published_at=published_at,
        )
        self.session.add(news)
        self.session.commit()
        self.session.refresh(news)
        return news


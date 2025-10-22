from datetime import datetime
from typing import Iterable, Sequence

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.db.models import Asset, PriceBar


class PriceDataRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def latest_timestamp(self, asset: Asset) -> datetime | None:
        result = self.session.exec(
            select(PriceBar)
            .where(PriceBar.asset_id == asset.id)
            .order_by(PriceBar.timestamp.desc())
            .limit(1)
        ).first()
        return result.timestamp if result else None

    def add_price_bars(self, asset: Asset, bars: Sequence[PriceBar]) -> int:
        inserted = 0
        for bar in bars:
            bar.asset_id = asset.id  # ensure FK is set
            try:
                self.session.add(bar)
                self.session.commit()
                inserted += 1
            except IntegrityError:
                self.session.rollback()
        return inserted

    def get_history(self, asset: Asset, lookback: int = 252) -> list[PriceBar]:
        return list(
            self.session.exec(
                select(PriceBar)
                .where(PriceBar.asset_id == asset.id)
                .order_by(PriceBar.timestamp.desc())
                .limit(lookback)
            )
        )[::-1]

    def delete_price_data(self, asset: Asset) -> None:
        bars = self.session.exec(select(PriceBar).where(PriceBar.asset_id == asset.id))
        for bar in bars:
            self.session.delete(bar)
        self.session.commit()


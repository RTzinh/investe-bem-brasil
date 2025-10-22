from typing import Iterable, Optional

from sqlmodel import Session, select

from app.db.models import Asset, AssetClass, Holding, PortfolioTarget


class AssetRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_assets(self) -> list[Asset]:
        return list(self.session.exec(select(Asset)))

    def get_by_symbol(self, symbol: str) -> Optional[Asset]:
        return self.session.exec(select(Asset).where(Asset.symbol == symbol)).first()

    def ensure_asset(
        self,
        symbol: str,
        name: str,
        asset_class: AssetClass,
        currency: str = "BRL",
    ) -> Asset:
        asset = self.get_by_symbol(symbol)
        if asset:
            return asset

        asset = Asset(symbol=symbol, name=name, asset_class=asset_class, currency=currency)
        self.session.add(asset)
        self.session.commit()
        self.session.refresh(asset)
        return asset

    def upsert_holdings(self, asset: Asset, quantity: float, average_price: float) -> Holding:
        holding = self.session.exec(
            select(Holding).where(Holding.asset_id == asset.id)
        ).first()
        if holding:
            holding.quantity = quantity
            holding.average_price = average_price
        else:
            holding = Holding(asset_id=asset.id, quantity=quantity, average_price=average_price)
            self.session.add(holding)

        self.session.commit()
        self.session.refresh(holding)
        return holding

    def upsert_targets(
        self,
        asset: Asset,
        target_weight: float,
        tolerance: float,
        risk_budget: Optional[float] = None,
    ) -> PortfolioTarget:
        target = self.session.exec(
            select(PortfolioTarget).where(PortfolioTarget.asset_id == asset.id)
        ).first()
        if target:
            target.target_weight = target_weight
            target.lower_band = target_weight * (1 - tolerance)
            target.upper_band = target_weight * (1 + tolerance)
            target.risk_budget = risk_budget
        else:
            target = PortfolioTarget(
                asset_id=asset.id,
                target_weight=target_weight,
                lower_band=target_weight * (1 - tolerance),
                upper_band=target_weight * (1 + tolerance),
                risk_budget=risk_budget,
            )
            self.session.add(target)

        self.session.commit()
        self.session.refresh(target)
        return target

    def bulk_ensure_assets(self, assets: Iterable[Asset]) -> None:
        for asset in assets:
            if not self.get_by_symbol(asset.symbol):
                self.session.add(asset)
        self.session.commit()


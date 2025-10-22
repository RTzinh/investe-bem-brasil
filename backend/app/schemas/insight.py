from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class InsightSchema(BaseModel):
    id: int
    asset_symbol: Optional[str]
    title: str
    summary: str
    rationale: Optional[str]
    impact: Optional[str]
    created_at: datetime
    raw_context: Optional[dict]

    class Config:
        from_attributes = True


class InsightCreateSchema(BaseModel):
    asset_symbol: Optional[str]
    documents: list[str]


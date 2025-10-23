from typing import Literal

from pydantic import BaseModel, Field


class AssistantMessageSchema(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class AssistantChatRequest(BaseModel):
    messages: list[AssistantMessageSchema]


class AssistantChatResponse(BaseModel):
    reply: str

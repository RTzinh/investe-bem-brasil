from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse
from app.services.ai_insights import GeminiInsightService

router = APIRouter()


@router.post('/', response_model=AssistantChatResponse)
async def chat_with_assistant(payload: AssistantChatRequest) -> AssistantChatResponse:
    if not payload.messages:
        raise HTTPException(status_code=400, detail='A conversa nao pode estar vazia.')

    settings = get_settings()
    service = GeminiInsightService(settings)
    reply = await service.chat(payload.messages)
    return AssistantChatResponse(reply=reply)


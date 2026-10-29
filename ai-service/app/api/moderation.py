"""
API routes for chat content moderation.
"""

from fastapi import APIRouter
from app.schemas.moderation import TextModerationRequest, TextModerationResponse
from app.services.moderation_service import moderation_service

router = APIRouter(prefix="/api/v1/moderation", tags=["Text Moderation"])


@router.post("/text", response_model=TextModerationResponse)
async def moderate_text(request: TextModerationRequest):
    """
    Evaluate chat message text for prohibited content, profanity, or toxicity.
    """
    result = moderation_service.analyze_text(request.text)
    return result

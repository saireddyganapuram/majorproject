"""
Pydantic schemas for text moderation requests and responses.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class TextModerationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, description="Chat text to moderate")
    session_id: Optional[str] = Field(None, description="Classroom session ID")
    sender_id: Optional[str] = Field(None, description="Sender ID")


class TextModerationResponse(BaseModel):
    flagged: bool = Field(..., description="True if text violates moderation policy")
    severity: str = Field(..., description="none, low, medium, or high")
    categories: List[str] = Field(default_factory=list, description="Violated categories")
    toxicity_score: float = Field(..., ge=0.0, le=1.0, description="Calculated toxicity index")
    confidence: Optional[float] = Field(0.9, description="Model prediction confidence")
    clean_text: str = Field(..., description="Sanitized text with masked terms")

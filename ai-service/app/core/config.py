"""
AI Service configuration module.
Loads settings from environment variables.
"""

import os
from dataclasses import dataclass, field
from typing import List


@dataclass
class Settings:
    """Application settings loaded from environment variables."""

    # Server
    HOST: str = os.getenv("AI_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("AI_PORT", "8000"))
    ENVIRONMENT: str = os.getenv("AI_ENVIRONMENT", "development")

    # CORS - allowed origins
    ALLOWED_ORIGINS: List[str] = field(
        default_factory=lambda: os.getenv(
            "AI_ALLOWED_ORIGINS", "http://localhost:5000,http://localhost:5173"
        ).split(",")
    )

    # Logging
    LOG_LEVEL: str = os.getenv("AI_LOG_LEVEL", "INFO")

    # Model configuration
    FACE_DETECTION_CONFIDENCE: float = float(
        os.getenv("AI_FACE_DETECTION_CONFIDENCE", "0.5")
    )
    ENGAGEMENT_SAMPLE_INTERVAL: int = int(
        os.getenv("AI_ENGAGEMENT_SAMPLE_INTERVAL", "5")
    )

    # NLP Moderation
    MODERATION_MODEL: str = os.getenv(
        "AI_MODERATION_MODEL", "unitary/toxic-bert"
    )
    MODERATION_THRESHOLD: float = float(
        os.getenv("AI_MODERATION_THRESHOLD", "0.7")
    )


settings = Settings()

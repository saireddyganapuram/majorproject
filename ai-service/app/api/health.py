"""
Health check endpoints for the AI service.
"""

import time
import platform
from fastapi import APIRouter, Request

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check(request: Request):
    """Basic health check endpoint."""
    uptime = time.time() - request.app.state.start_time if hasattr(request.app.state, 'start_time') else 0

    return {
        "success": True,
        "message": "AI Service is operational",
        "data": {
            "service": "virtual-classroom-ai-service",
            "status": "healthy",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "uptime": round(uptime, 2),
            "python_version": platform.python_version(),
            "models": {
                "loaded": getattr(request.app.state, 'models_loaded', False),
                "face_detection": "pending",
                "engagement_scoring": "pending",
                "nlp_moderation": "pending",
            },
        },
    }


@router.get("/api/v1/health")
async def api_health_check(request: Request):
    """Versioned API health check endpoint."""
    return {
        "success": True,
        "message": "AI Service API v1 is operational",
        "data": {
            "service": "virtual-classroom-ai-service",
            "api_version": "v1",
            "status": "healthy",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "capabilities": {
                "face_detection": False,
                "head_pose_estimation": False,
                "gaze_approximation": False,
                "engagement_scoring": False,
                "nlp_moderation": False,
            },
        },
    }

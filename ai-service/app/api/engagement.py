"""
API routes for engagement analysis.
"""

from fastapi import APIRouter, HTTPException
from app.schemas.engagement import (
    EngagementAnalysisRequest,
    EngagementAnalysisResponse,
)
from app.services.engagement_service import engagement_service

router = APIRouter(prefix="/api/v1/analyze", tags=["Engagement Analysis"])


@router.post("/face", response_model=EngagementAnalysisResponse)
async def analyze_face_engagement(request: EngagementAnalysisRequest):
    """
    Process video frame or facial landmarks and return computed engagement metrics.
    Privacy note: Raw frame data is analyzed in-memory and immediately discarded.
    """
    try:
        metrics = engagement_service.compute_engagement(
            frame_base64=request.frame_base64,
            landmarks=request.landmarks,
        )
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Engagement analysis computation failed: {str(e)}",
        )


@router.post("/batch")
async def analyze_batch(requests: list[EngagementAnalysisRequest]):
    """
    Process multiple student metrics in batch for multi-tile classrooms.
    """
    results = []
    for req in requests:
        res = engagement_service.compute_engagement(
            frame_base64=req.frame_base64,
            landmarks=req.landmarks,
        )
        res["student_id"] = req.student_id
        results.append(res)
    return {"success": True, "count": len(results), "data": results}

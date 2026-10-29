"""
Pydantic schemas for engagement analysis requests and responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class EngagementAnalysisRequest(BaseModel):
    """Request payload containing either a base64 video frame or client-extracted landmarks."""
    frame_base64: Optional[str] = Field(None, description="Base64 encoded JPEG/PNG frame")
    landmarks: Optional[List[Dict[str, float]]] = Field(None, description="Optional facial landmark 3D points")
    student_id: Optional[str] = Field(None, description="Student ID")
    session_id: Optional[str] = Field(None, description="Session ID")
    timestamp: Optional[float] = Field(None, description="Client timestamp in ms")


class HeadPoseAngles(BaseModel):
    yaw: float = Field(..., description="Yaw angle in degrees (-90 to 90)")
    pitch: float = Field(..., description="Pitch angle in degrees (-90 to 90)")
    roll: float = Field(..., description="Roll angle in degrees (-90 to 90)")


class EngagementAnalysisResponse(BaseModel):
    """Complete computed engagement metrics."""
    face_detected: bool = Field(..., description="True if a face was detected")
    overall_engagement_score: float = Field(..., ge=0.0, le=100.0, description="Overall score 0-100")
    state: str = Field(..., description="Engagement category: attentive, neutral, distracted, drowsy")
    attention_direction: str = Field(..., description="Estimated head gaze direction: forward, left, right, etc.")
    head_pose: HeadPoseAngles
    eye_gaze_score: float = Field(..., ge=0.0, le=100.0, description="Eye focus confidence 0-100")
    ear: float = Field(..., description="Eye Aspect Ratio proxy")
    distraction_flag: bool = Field(..., description="True if student attention is flagged as distracted")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Metric computation confidence")
    notes: Optional[str] = None

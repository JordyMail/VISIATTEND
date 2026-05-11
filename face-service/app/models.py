"""
Pydantic models untuk request/response
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


# ============================================
# Health Check Models
# ============================================

class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Status service: 'healthy' atau 'unhealthy'")
    service: str = Field(..., description="Nama service")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    model_loaded: bool = Field(..., description="Status model DeepFace")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "service": "VISIATTEND Face Recognition Service",
                "timestamp": "2026-04-20T08:00:00.000Z",
                "model_loaded": True
            }
        }


# ============================================
# Face Registration Models
# ============================================

class RegisterFaceRequest(BaseModel):
    """Request untuk register wajah"""
    user_id: str = Field(..., description="ID user yang mendaftar wajah", min_length=1)
    device_info: Optional[str] = Field(None, description="Info perangkat (optional)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "VST-001",
                "device_info": "Samsung Galaxy S21"
            }
        }


class RegisterFaceData(BaseModel):
    """Data dalam response register"""
    user_id: str = Field(..., description="ID user")
    face_registered: bool = Field(..., description="Status registrasi wajah")
    face_status: str = Field(..., description="Status wajah: ACTIVE, NOT_REGISTERED, DISABLED")
    confidence: float = Field(..., description="Confidence score")
    timestamp: str = Field(..., description="ISO 8601 timestamp")


class RegisterFaceResponse(BaseModel):
    """Response untuk register wajah"""
    success: bool = Field(..., description="Status operasi")
    message: str = Field(..., description="Pesan deskriptif")
    data: RegisterFaceData = Field(..., description="Data hasil registrasi")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Face registered successfully",
                "data": {
                    "user_id": "VST-001",
                    "face_registered": True,
                    "face_status": "ACTIVE",
                    "confidence": 0.95,
                    "timestamp": "2026-04-20T08:00:00.000Z"
                }
            }
        }


# ============================================
# Face Verification Models
# ============================================

class VerifyFaceRequest(BaseModel):
    """Request untuk verify wajah"""
    user_id: Optional[str] = Field(None, description="ID user untuk di-verify (optional)")
    device_info: Optional[str] = Field(None, description="Info perangkat (optional)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "VST-001",
                "device_info": "Samsung Galaxy S21"
            }
        }


class VerifyFaceData(BaseModel):
    """Data dalam response verify"""
    matched: bool = Field(..., description="Status kecocokan wajah")
    matched_user_id: Optional[str] = Field(None, description="ID user yang cocok (jika matched=true)")
    confidence: float = Field(..., description="Confidence score (0-1)")
    code: str = Field(
        ...,
        description="Code untuk UI: FACE_MATCH, FACE_NOT_MATCH, FACE_NOT_REGISTERED, FACE_NOT_DETECTED"
    )
    timestamp: str = Field(..., description="ISO 8601 timestamp")


class VerifyFaceResponse(BaseModel):
    """Response untuk verify wajah"""
    success: bool = Field(..., description="Status operasi")
    message: str = Field(..., description="Pesan deskriptif")
    data: VerifyFaceData = Field(..., description="Data hasil verifikasi")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Face verification completed",
                "data": {
                    "matched": True,
                    "matched_user_id": "VST-001",
                    "confidence": 0.92,
                    "code": "FACE_MATCH",
                    "timestamp": "2026-04-20T08:00:00.000Z"
                }
            }
        }


# ============================================
# Face Registration Status Models
# ============================================

class FaceRegistrationStatus(BaseModel):
    """Status registrasi wajah"""
    user_id: str = Field(..., description="ID user")
    face_registered: bool = Field(..., description="Status registrasi")
    face_status: str = Field(..., description="Status wajah")


# ============================================
# Error Models
# ============================================

class ErrorResponse(BaseModel):
    """Response untuk error"""
    success: bool = Field(default=False, description="Status operasi")
    message: str = Field(..., description="Pesan error")
    details: Optional[Dict[str, Any]] = Field(None, description="Detail tambahan (optional)")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "message": "User not found",
                "details": {},
                "timestamp": "2026-04-20T08:00:00.000Z"
            }
        }


# ============================================
# Generic Response Models
# ============================================

class GenericSuccessResponse(BaseModel):
    """Generic success response"""
    success: bool = Field(default=True)
    message: str = Field(...)
    data: Optional[Dict[str, Any]] = Field(None)


class GenericErrorResponse(BaseModel):
    """Generic error response"""
    success: bool = Field(default=False)
    message: str = Field(...)
    timestamp: Optional[str] = Field(None)

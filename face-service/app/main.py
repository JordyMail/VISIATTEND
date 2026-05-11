"""
VISIATTEND Face Recognition Service
FastAPI service untuk register dan verify wajah menggunakan DeepFace
Hanya jalan ketika ada request dari backend Node.js
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, status, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
from typing import Optional
import os
from datetime import datetime

from app.face_recognition import FaceRecognitionEngine
from app.models import (
    RegisterFaceRequest,
    VerifyFaceRequest,
    RegisterFaceResponse,
    VerifyFaceResponse,
    ErrorResponse,
    HealthResponse
)
from app.config import Config

# ============================================
# Configuration & Logging
# ============================================
config = Config()

# Setup logging
os.makedirs(config.LOG_DIR, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(config.LOG_DIR, 'face_service.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============================================
# FastAPI App Setup
# ============================================
app = FastAPI(
    title="VISIATTEND Face Recognition Service",
    description="Service untuk face registration dan verification menggunakan DeepFace",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Face Recognition Engine
face_engine = FaceRecognitionEngine(config=config)

# ============================================
# Health Check Endpoints
# ============================================

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint untuk monitoring service.
    Response berisi status service dan info DeepFace model.
    """
    try:
        logger.info("Health check called")
        return HealthResponse(
            status="healthy",
            service="VISIATTEND Face Recognition Service",
            timestamp=datetime.utcnow().isoformat(),
            model_loaded=face_engine.model_loaded
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "unhealthy",
                "message": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@app.get("/ping", tags=["Health"])
async def ping():
    """Simple ping endpoint"""
    return {"message": "pong", "timestamp": datetime.utcnow().isoformat()}


# ============================================
# Face Registration Endpoints
# ============================================

@app.post(
    "/api/face/register",
    response_model=RegisterFaceResponse,
    tags=["Face Registration"],
    summary="Register user face",
    description="Upload foto wajah untuk registrasi. Foto diekstrak embedingnya dan disimpan."
)
async def register_face(
    user_id: str,
    file: UploadFile = File(...),
    device_info: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Endpoint untuk registrasi wajah user.
    
    Parameters:
    - user_id: ID user yang mendaftar wajah
    - file: Upload file foto wajah (JPG, PNG)
    - device_info: Info perangkat (optional)
    
    Response:
    - success: boolean
    - message: pesan deskriptif
    - data: {
        user_id: str,
        face_registered: bool,
        face_status: str,
        confidence: float,
        timestamp: str
      }
    """
    try:
        # Validasi input
        if not user_id or user_id.strip() == "":
            logger.warning("Register face called with empty user_id")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id is required and cannot be empty"
            )
        
        if not file:
            logger.warning(f"Register face called with no file for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is required"
            )
        
        # Validasi tipe file
        allowed_extensions = ['jpg', 'jpeg', 'png', 'gif']
        file_ext = file.filename.split('.')[-1].lower()
        if file_ext not in allowed_extensions:
            logger.warning(f"Invalid file type for user {user_id}: {file_ext}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{file_ext}' not allowed. Use JPG, PNG, or GIF"
            )
        
        # Process registration
        logger.info(f"Starting face registration for user {user_id}")
        result = await face_engine.register_face(
            user_id=user_id,
            file=file,
            device_info=device_info
        )
        
        logger.info(f"Face registration successful for user {user_id}")
        
        return RegisterFaceResponse(
            success=True,
            message="Face registered successfully",
            data={
                "user_id": user_id,
                "face_registered": True,
                "face_status": "ACTIVE",
                "confidence": result.get("confidence", 0.0),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering face for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register face: {str(e)}"
        )


# ============================================
# Face Verification Endpoints
# ============================================

@app.post(
    "/api/face/verify",
    response_model=VerifyFaceResponse,
    tags=["Face Verification"],
    summary="Verify face against registered profile",
    description="Verify foto wajah terhadap data wajah yang sudah terdaftar"
)
async def verify_face(
    file: UploadFile = File(...),
    user_id: Optional[str] = None,
    device_info: Optional[str] = None
):
    """
    Endpoint untuk verifikasi wajah.
    Bisa mencari user berdasarkan foto, atau verify terhadap user tertentu.
    
    Parameters:
    - file: Upload file foto wajah (JPG, PNG)
    - user_id: (Optional) ID user untuk di-verify. Jika kosong, cari dari database
    - device_info: Info perangkat (optional)
    
    Response:
    - success: boolean
    - message: pesan deskriptif
    - data: {
        matched: bool,
        matched_user_id: str or null,
        confidence: float,
        code: str (FACE_MATCH, FACE_NOT_MATCH, FACE_NOT_REGISTERED, FACE_NOT_DETECTED),
        timestamp: str
      }
    """
    try:
        # Validasi file
        if not file:
            logger.warning("Verify face called with no file")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is required"
            )
        
        # Validasi tipe file
        allowed_extensions = ['jpg', 'jpeg', 'png', 'gif']
        file_ext = file.filename.split('.')[-1].lower()
        if file_ext not in allowed_extensions:
            logger.warning(f"Invalid file type for verification: {file_ext}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{file_ext}' not allowed. Use JPG, PNG, or GIF"
            )
        
        # Process verification
        if user_id:
            logger.info(f"Starting face verification against user {user_id}")
        else:
            logger.info("Starting face verification (searching database)")
        
        result = await face_engine.verify_face(
            file=file,
            user_id=user_id,
            device_info=device_info
        )
        
        logger.info(f"Face verification completed: matched={result['matched']}")
        
        return VerifyFaceResponse(
            success=True,
            message="Face verification completed",
            data={
                "matched": result["matched"],
                "matched_user_id": result.get("matched_user_id"),
                "confidence": result["confidence"],
                "code": result["code"],
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying face: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify face: {str(e)}"
        )


# ============================================
# Utility Endpoints
# ============================================

@app.get(
    "/api/face/check-registration/{user_id}",
    tags=["Face Utilities"],
    summary="Check if user has registered face",
    description="Cek apakah user sudah punya profil wajah terdaftar"
)
async def check_registration(user_id: str):
    """
    Check apakah user sudah register wajah.
    
    Parameters:
    - user_id: ID user untuk di-check
    
    Response:
    - success: boolean
    - data: {
        user_id: str,
        face_registered: bool,
        face_status: str
      }
    """
    try:
        if not user_id or user_id.strip() == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id is required"
            )
        
        logger.info(f"Checking face registration status for user {user_id}")
        is_registered = face_engine.check_registration(user_id)
        
        return {
            "success": True,
            "data": {
                "user_id": user_id,
                "face_registered": is_registered,
                "face_status": "ACTIVE" if is_registered else "NOT_REGISTERED"
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check registration: {str(e)}"
        )


@app.delete(
    "/api/face/{user_id}",
    tags=["Face Utilities"],
    summary="Delete user face profile",
    description="Hapus profil wajah user"
)
async def delete_face_profile(user_id: str):
    """
    Hapus profil wajah user dari database.
    
    Parameters:
    - user_id: ID user yang profilnya akan dihapus
    
    Response:
    - success: boolean
    - message: string
    """
    try:
        if not user_id or user_id.strip() == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id is required"
            )
        
        logger.info(f"Deleting face profile for user {user_id}")
        deleted = face_engine.delete_face_profile(user_id)
        
        if deleted:
            logger.info(f"Face profile deleted successfully for user {user_id}")
            return {
                "success": True,
                "message": f"Face profile deleted for user {user_id}"
            }
        else:
            logger.warning(f"Face profile not found for user {user_id}")
            return {
                "success": False,
                "message": f"Face profile not found for user {user_id}"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting face profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete face profile: {str(e)}"
        )


# ============================================
# Info Endpoints
# ============================================

@app.get("/api/info", tags=["Info"])
async def get_info():
    """Get service information"""
    return {
        "service": "VISIATTEND Face Recognition Service",
        "version": "1.0.0",
        "description": "FastAPI service untuk face registration dan verification",
        "endpoints": {
            "health": "/health",
            "face_register": "POST /api/face/register",
            "face_verify": "POST /api/face/verify",
            "check_registration": "GET /api/face/check-registration/{user_id}",
            "delete_profile": "DELETE /api/face/{user_id}"
        }
    }


# ============================================
# Error Handlers
# ============================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    logger.error(f"HTTP Exception: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled Exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal server error",
            "timestamp": datetime.utcnow().isoformat()
        }
    )


# ============================================
# Startup & Shutdown
# ============================================

@app.on_event("startup")
async def startup_event():
    """Initialize on service startup"""
    logger.info("=" * 50)
    logger.info("VISIATTEND Face Recognition Service Starting")
    logger.info("=" * 50)
    try:
        await face_engine.initialize()
        logger.info("Face Recognition Engine initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Face Recognition Engine: {str(e)}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on service shutdown"""
    logger.info("=" * 50)
    logger.info("VISIATTEND Face Recognition Service Shutting Down")
    logger.info("=" * 50)
    face_engine.cleanup()


# ============================================
# Root Endpoint
# ============================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "VISIATTEND Face Recognition Service is running",
        "docs": "/docs",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

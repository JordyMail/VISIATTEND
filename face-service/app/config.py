"""
Configuration untuk Face Recognition Service
"""

import os
from typing import List


class Config:
    """Configuration class"""
    
    # Service Configuration
    SERVICE_NAME = "VISIATTEND Face Recognition Service"
    SERVICE_VERSION = "1.0.0"
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    # Server Configuration
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8000))
    RELOAD = os.getenv("RELOAD", "False").lower() == "true"
    
    # Storage Configuration
    STORAGE_DIR = os.getenv("STORAGE_DIR", "storage")
    LOG_DIR = os.getenv("LOG_DIR", "logs")
    
    # Model Configuration
    MODEL_NAME = os.getenv("MODEL_NAME", "ArcFace")
    CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", 0.55))
    
    # CORS Configuration
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:5173",
        "http://10.0.2.2:8080",  # Android emulator
        "http://10.0.2.2:3000",   # Android emulator
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ]
    
    # File Upload Configuration
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 10 * 1024 * 1024))  # 10MB default
    ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif"]
    
    # Face Detection Configuration
    FACE_DETECTION_BACKEND = os.getenv("FACE_DETECTION_BACKEND", "retinaface")
    ENFORCE_DETECTION = os.getenv("ENFORCE_DETECTION", "true").lower() == "true"
    
    # Logging Configuration
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Feature Flags
    ENABLE_REGISTRATION = os.getenv("ENABLE_REGISTRATION", "true").lower() == "true"
    ENABLE_VERIFICATION = os.getenv("ENABLE_VERIFICATION", "true").lower() == "true"
    ENABLE_DELETION = os.getenv("ENABLE_DELETION", "true").lower() == "true"
    
    def __init__(self):
        """Initialize config dan create directories"""
        os.makedirs(self.STORAGE_DIR, exist_ok=True)
        os.makedirs(self.LOG_DIR, exist_ok=True)
    
    def to_dict(self):
        """Convert config to dictionary"""
        return {
            "SERVICE_NAME": self.SERVICE_NAME,
            "SERVICE_VERSION": self.SERVICE_VERSION,
            "DEBUG": self.DEBUG,
            "HOST": self.HOST,
            "PORT": self.PORT,
            "STORAGE_DIR": self.STORAGE_DIR,
            "LOG_DIR": self.LOG_DIR,
            "MODEL_NAME": self.MODEL_NAME,
            "CONFIDENCE_THRESHOLD": self.CONFIDENCE_THRESHOLD,
        }


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    RELOAD = True
    LOG_LEVEL = "DEBUG"


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    RELOAD = False
    LOG_LEVEL = "WARNING"


def get_config():
    """Get configuration based on environment"""
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env == "production":
        return ProductionConfig()
    
    return DevelopmentConfig()

"""
AI-Based Virtual Classroom Engagement Analytics - AI Service
Main FastAPI application entry point.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import logging

from app.core.config import settings
from app.api.health import router as health_router
from app.api.engagement import router as engagement_router
from app.api.moderation import router as moderation_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ai-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events for model loading and cleanup."""
    logger.info("🚀 AI Service starting up...")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    logger.info(f"   Host: {settings.HOST}:{settings.PORT}")

    app.state.models_loaded = True
    app.state.start_time = time.time()
    logger.info("✅ AI Service ready with Engagement & Moderation pipelines")

    yield

    # Cleanup
    logger.info("⏻ AI Service shutting down...")


# Create FastAPI application
app = FastAPI(
    title="Virtual Classroom AI Service",
    description="Computer vision and NLP services for classroom engagement analytics",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "code": "INTERNAL_ERROR",
        },
    )


# Register routers
app.include_router(health_router)
app.include_router(engagement_router)
app.include_router(moderation_router)


# Root endpoint
@app.get("/")
async def root():
    return {
        "success": True,
        "message": "Virtual Classroom AI Service",
        "data": {
            "service": "ai-service",
            "version": "1.0.0",
            "docs": "/docs",
        },
    }

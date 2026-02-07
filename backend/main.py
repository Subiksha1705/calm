"""
Calm Sphere - Mental Health Chatbot Backend

A thread-based mental health chatbot with clean separation of concerns,
designed for easy migration to Firebase + LLM in production.

Architecture (PRD Section 4):
    Browser (Next.js)
         ↓ REST API
    FastAPI Backend (Python)
         ↓
    Hugging Face Inference API (future)
         ↓
    Firebase Firestore

This implementation supports both in-memory (development) and Firebase (production).
Set USE_FIREBASE=true in .env to use Firebase.
"""

# Load environment variables from .env file FIRST
from dotenv import load_dotenv
load_dotenv()

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from api.health import router as health_router
from api.threads import router as threads_router
from api.chat import router as chat_router
from core.storage import conversation_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    use_firebase = os.getenv("USE_FIREBASE", "false").lower() == "true"
    logger.info(f"🔧 USE_FIREBASE setting: {use_firebase}")
    
    if use_firebase:
        logger.info("🚀 Initializing Firebase Firestore...")
        try:
            from core.firebase_storage import get_conversation_store
            global conversation_store
            conversation_store = get_conversation_store()
            logger.info("✅ Firebase Firestore connected successfully!")
        except Exception as e:
            logger.error(f"⚠️  Firebase initialization failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            logger.info("📝 Falling back to in-memory storage")
    else:
        logger.info("📝 Using in-memory storage (set USE_FIREBASE=true in .env)")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down...")


# Initialize FastAPI application
app = FastAPI(
    title="Calm Sphere API",
    description=(
        "Mental Health Chatbot - Core Conversation Logic\n\n"
        "## Features\n"
        "- Thread-based conversations per user\n"
        "- Context retention within active thread\n"
        "- Mock LLM responses (swappable with Hugging Face)\n"
        "- In-memory storage (swappable with Firebase)\n\n"
        "## Base Path\n"
        "/api"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS (required for browser-based frontend)
cors_origins = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(health_router)
app.include_router(threads_router, prefix="/api")
app.include_router(chat_router, prefix="/api")


@app.get("/")
def root() -> dict:
    """Root endpoint with API information."""
    return {
        "name": "Calm Sphere API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", 8000))
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True
    )

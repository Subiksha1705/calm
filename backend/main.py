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

# Load environment variables from backend/.env (development) without
# overriding any real environment variables (production).
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env", override=False)

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
from api.auth import router as auth_router
from core.storage import conversation_store, init_conversation_store_from_env
from core.llm import llm_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    use_firebase = os.getenv("USE_FIREBASE", "false").lower() == "true"
    fallback_to_memory = os.getenv("FIREBASE_FALLBACK_TO_MEMORY", "false").lower() == "true"
    logger.info(f"🔧 USE_FIREBASE setting: {use_firebase}")

    try:
        selected = init_conversation_store_from_env()
        logger.info(f"✅ Conversation store initialized: {selected}")
    except Exception as e:
        logger.error(f"⚠️  Conversation store initialization failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        if not fallback_to_memory:
            raise
        logger.info("📝 Falling back to in-memory storage (FIREBASE_FALLBACK_TO_MEMORY=true)")

    # Allow LLM service to use the configured store for context when needed.
    try:
        llm_service.set_store(conversation_store)
    except Exception:
        # Non-fatal (mock mode doesn't need store).
        pass
    
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
app.include_router(auth_router, prefix="/api")
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

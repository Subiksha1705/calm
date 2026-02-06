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
    Firebase Firestore (future)

This implementation uses in-memory storage for development.
Replace with Firestore for production.

Repository Structure (PRD Section 6):
    backend/
    ├── api/            # Route definitions
    │   ├── chat.py
    │   ├── threads.py
    │   └── health.py
    ├── core/           # Business logic
    │   ├── storage.py
    │   └── llm.py
    ├── schemas/        # Pydantic models
    │   ├── chat.py
    │   └── thread.py
    ├── main.py
    └── requirements.txt
"""

from fastapi import FastAPI

from api.health import router as health_router
from api.threads import router as threads_router
from api.chat import router as chat_router


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
    redoc_url="/redoc"
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
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

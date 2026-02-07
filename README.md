# Calm Sphere

Thread-based mental health chatbot with:
- `backend/`: FastAPI REST API (in-memory threads)
- `frontend/`: Next.js UI

## Environment setup

This repo intentionally reads hosts/ports from env (no hardcoded `localhost:8000` in code).

### Backend

1. Create env file:
   - Copy `backend/.env.example` → `backend/.env`
2. Install deps:
   - `python -m venv backend/.venv`
   - `backend/.venv/bin/pip install -r backend/requirements.txt`
3. Run:
   - `backend/.venv/bin/python -m uvicorn main:app --reload --host $BACKEND_HOST --port $BACKEND_PORT`

### Frontend

1. Create env file:
   - Copy `frontend/.env.local.example` → `frontend/.env.local`
2. Install deps:
   - `npm -C frontend install`
3. Run:
   - `npm -C frontend run dev`

## Run both together

From `frontend/`:
- `npm run dev:all`

This starts:
- FastAPI from `backend/` using `backend/.env`
- Next.js from `frontend/` using `frontend/.env.local`

## API overview

Base URL: `${NEXT_PUBLIC_API_BASE_URL}`

- `GET /threads?user_id=...`
- `POST /threads` `{ user_id }`
- `GET /threads/{thread_id}?user_id=...`
- `POST /chat` `{ user_id, thread_id, message }`
- `POST /chat/regenerate` `{ user_id, thread_id }`


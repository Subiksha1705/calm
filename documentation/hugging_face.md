## Calm Sphere – Hugging Face Router (Models + Integration)

This project uses the **Hugging Face Router** with the **OpenAI-compatible** API:

- Base URL: `https://router.huggingface.co`
- Endpoint: `POST /v1/chat/completions`

Important: the classic endpoint `https://api-inference.huggingface.co/models/...` is deprecated, and many “Hub models”
are **not** available via the router model list (`GET https://router.huggingface.co/v1/models`). If a model is not
router-listed, you’ll need a different serving approach (e.g. a dedicated endpoint, or self-hosting).

### Multi-model pipeline (router-listed)

We use a “specialist model” approach while keeping all calls on the same router endpoint.

| Responsibility | Model (router-listed) | Notes |
|---|---|---|
| Response generation | `meta-llama/Llama-3.2-3B-Instruct` | Fast/cheap default assistant |
| Emotion detection | `Qwen/Qwen2.5-7B-Instruct` | JSON label + confidence via prompting |
| Risk & safety | `openai/gpt-oss-safeguard-20b` | JSON risk scores + overall_risk |
| Routine support | `meta-llama/Llama-3.2-3B-Instruct` | Handled by the main assistant |
| Long-context analysis | `meta-llama/Llama-3.1-70B-Instruct` | Used only for analysis endpoints/jobs |

### Environment variables

In `backend/.env` (see `backend/.env.example`):

- `HUGGING_FACE_API_KEY=hf_...`
- `HUGGING_FACE_BASE_URL=https://router.huggingface.co`
- `LLM_MODEL_RESPONSE=meta-llama/Llama-3.2-3B-Instruct`
- `LLM_MODEL_EMOTION=Qwen/Qwen2.5-7B-Instruct`
- `LLM_MODEL_RISK=openai/gpt-oss-safeguard-20b`
- `LLM_MODEL_ANALYSIS=meta-llama/Llama-3.1-70B-Instruct`
- `LLM_ENABLE_EMOTION=true|false`
- `LLM_ENABLE_RISK=true|false`

### Local tests

- Quick connection test (response model only): `python backend/scripts/test_huggingface_connection.py`
- Full smoke test (all models + JSON parsing): `python backend/scripts/smoke_test_router_models.py`

4. The 3-Layer Memory Strategy

To maintain speed, the system injects only necessary data into the prompt, capped at $\approx 1,200$ tokens.

Thread Context (Active): Last 3–5 messages for immediate flow.

Thread Summaries (History): 2–4 sentence factual snapshots of past interactions.

User Profile (Identity): Stable facts (Name, Role, Education).

5. Mental Health Factor Framework (The "Shadow Profile")

This is a structured, analytical layer stored in Firestore that tracks the user across six dimensions. It is not raw chat data, but aggregated signals.

A. Biological: Sleep, energy, physical health.

B. Psychological: Coping effectiveness, self-esteem, thought patterns.

C. Social: Connectedness vs. isolation, relationship quality.

D. Environmental: Work/Academic pressure, financial/living stress.

E. Lifestyle: Routine stability, physical activity.

F. Life Events: Transitions, grief, or major changes.

EMA Rule: Scores are updated using an Exponential Moving Average. Older signals decay, while consistent new signals shift the baseline.

6. Technical Performance Factors (The "Fasten" Strategy)

In-Memory Caching (Redis): Session context and profiles are cached to avoid database round-trips during the chat loop.

Parallel Inference: Emotion and Risk models run in parallel with the Context Orchestrator.

Asynchronous Updates: Summarization and Mental Factor calculations happen after the response is sent to the user.

Target Latency: * Cached Response: $< 200ms$

Full Pipeline: $< 1.5s$

7. AI Persona & Ethics Guardrails

Tone: Empathetic, calm, and brief (max 3 sentences).

Observational Language: Never diagnose. Use "I hear that you're feeling..." instead of "You have...".

Invisible Memory: Refer to memory naturally (e.g., "Since you're balancing those nursing shifts...") rather than listing facts.

Safety Override: If Risk Model score $> 0.85$, the AI instantly provides crisis resources and grounds the conversation.

8. Success Criteria

Retention: Users return because the AI "knows" them without being creepy.

Safety: Zero missed crisis flags.

Predictability: The memory behavior feels consistent and reliable.

Speed: Latency remains stable even as user history grows.

9. API Endpoint Specifications (REST)

All endpoints are RESTful and return JSON responses.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Health check endpoint |
| `/api/v1/chat` | POST | Send a message and get AI response |
| `/api/v1/chat/{threadId}` | GET | Get chat history for a thread |
| `/api/v1/threads` | GET | List all user threads |
| `/api/v1/threads` | POST | Create a new thread |
| `/api/v1/threads/{threadId}` | DELETE | Delete a thread |
| `/api/v1/users/profile` | GET | Get user profile |
| `/api/v1/users/profile` | PUT | Update user profile |

Request/Response Examples:

```json
// POST /api/v1/chat
{
  "thread_id": "thread_123",
  "message": "I've been feeling really anxious lately",
  "stream": true
}

// Response
{
  "thread_id": "thread_123",
  "message": "I hear that you're feeling anxious. Would you like to talk about what's been on your mind?",
  "emotions_detected": ["anxiety", "fear"],
  "risk_level": 0.12,
  "latency_ms": 847
}
```

10. Authentication & Authorization

Authentication: Firebase Auth (JWT-based)

- All API endpoints (except `/api/v1/health`) require a valid JWT token
- Token is passed in the `Authorization` header: `Bearer {token}`
- Tokens are validated on every request
- Refresh tokens are handled automatically by the client SDK

Authorization Rules:

| Resource | Rule |
|----------|------|
| User Profile | User can only access their own profile (`userId == auth.uid`) |
| Threads | User can only access threads they created |
| Messages | User can only access messages within their threads |

11. Error Handling Strategy

Standard Error Response Format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Error Codes:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_TOKEN` | 401 | Invalid or expired JWT token |
| `AUTH_UNAUTHORIZED` | 403 | User doesn't have permission |
| `RESOURCE_NOT_FOUND` | 404 | Thread/user not found |
| `VALIDATION_ERROR` | 400 | Invalid request payload |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `MODEL_ERROR` | 503 | AI model inference failed |
| `DATABASE_ERROR` | 500 | Firestore/Redis operation failed |

Error Handling Logic:

- **4xx Errors**: Client-side issues → Return immediately with error details
- **5xx Errors**: Server-side issues → Log error, return generic message
- **Model Failures**: Fallback to simplified response with crisis resources if applicable
- **Database Failures**: Retry once, then fail gracefully with cached data if available

12. Rate Limiting & Abuse Prevention

Rate Limits:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/v1/chat` | 30 requests | 1 minute |
| `/api/v1/threads` | 60 requests | 1 minute |
| `/api/v1/users/profile` | 20 requests | 1 minute |
| General | 100 requests | 1 minute |

Abuse Detection:

- **Crisis Keyword Monitoring**: Any message containing crisis keywords triggers immediate human review flag
- **Message Volume Alerts**: >100 messages/hour → Alert moderation team
- **Anomaly Detection**: Unusual usage patterns → Temporary rate limit

User Actions on Violation:

- **First Violation**: Warning message
- **Second Violation**: 1-hour cooldown
- **Third Violation**: 24-hour suspension + human review

13. Infrastructure Configuration

13.1 Redis Configuration

```yaml
redis:
  host: "${REDIS_HOST}"
  port: 6379
  password: "${REDIS_PASSWORD}"
  db: 0
  pool:
    max_connections: 50
    timeout: 5s
  cache:
    session_ttl: 1800  # 30 minutes
    max_memory: "2GB"
    eviction_policy: "allkeys-lru"
```

13.2 Firestore Configuration

```yaml
firestore:
  project_id: "${FIREBASE_PROJECT_ID}"
  credentials_file: "${FIREBASE_CREDENTIALS_PATH}"
  database: "(default)"
  batch_size: 500
  timestamps_in_snapshot: true
```

13.3 Hugging Face Router (OpenAI-compatible)

```yaml
huggingface:
  base_url: "https://router.huggingface.co"
  api_token: "${HUGGING_FACE_API_KEY}"  # or HF_API_TOKEN / HF_API_KEY
  timeout: 30s
  retry:
    max_attempts: 3
    backoff_factor: 2
  models:
    response: "meta-llama/Llama-3.2-3B-Instruct"
    emotion: "Qwen/Qwen2.5-7B-Instruct"
    risk: "openai/gpt-oss-safeguard-20b"
    routine: "meta-llama/Llama-3.2-3B-Instruct"
    analysis: "meta-llama/Llama-3.1-70B-Instruct"
```

14. Deployment Strategy

14.1 Architecture

```
[Client Apps]
      ↓
[Cloudflare Load Balancer]
      ↓
[FastAPI Backend - 3 replicas]
      ↓
[Redis Cluster (3 nodes)]
[Firebase Firestore]
[Hugging Face Inference API]
```

14.2 Deployment Pipeline

1. **Development**: Local Docker Compose
2. **Staging**: Kubernetes (GKE) - 2 replicas
3. **Production**: Kubernetes (GKE) - 3+ replicas with auto-scaling

14.3 Environment Variables

```bash
# Required
FIREBASE_PROJECT_ID=calm-sphere-prod
FIREBASE_CREDENTIALS_PATH=/etc/secrets/firebase.json
REDIS_HOST=redis-cluster.internal
REDIS_PASSWORD=${REDIS_PASSWORD}
HUGGING_FACE_API_KEY=${HUGGING_FACE_API_KEY}  # or HF_API_TOKEN / HF_API_KEY

# Optional (with defaults)
LOG_LEVEL=INFO
MAX_WORKERS=4
API_HOST=0.0.0.0
API_PORT=8000
```

14.4 Monitoring & Logging

- **Health Checks**: `/api/v1/health` every 30s
- **Metrics**: Prometheus + Grafana dashboards
- **Logging**: Structured JSON logs (Datadog/Sentry)
- **Alerts**: PagerDuty for 5xx errors + latency >2s

15. Model Hosting Strategy

15.1 Primary: Hugging Face Inference API

- **Why**: Zero infrastructure overhead, automatic scaling, managed inference
- **Cost Model**: Pay-per-token
- **Latency**: ~500ms-2s per model
- **SLA**: 99.5% uptime

15.2 Fallback: Replicate with Smaller Models

If HF API is unavailable:

1. **Primary Fallback**: Use a smaller quantized model (e.g., `TinyLlama-1.1B-Chat`)
2. **Emergency Fallback**: Rule-based responses for crisis detection + pre-written responses

15.3 Future: Self-Hosting Considerations

- **When**: If monthly HF costs exceed $500
- **Hardware**: NVIDIA A100 (80GB) or multiple RTX 4090s
- **Framework**: vLLM for optimized inference
- **Expected Cost**: $2-5/hour per model

16. Edge Case Handling

16.1 Redis Cache Expiration

**Scenario**: User's Redis cache expires mid-conversation

**Handling**:
- On next request, fetch fresh data from Firestore
- Rebuild Redis cache with fresh data
- Notify user of "temporary connection issue" if latency >3s
- If Firestore also fails → Use last cached response with warning

16.2 Model API Failures

**Scenario**: Hugging Face API is down or times out

**Handling**:
1. **Retry Logic**: 3 retries with exponential backoff (1s, 2s, 4s)
2. **Fallback Model**: Switch to smaller/faster model
3. **Emergency Mode**: Pre-approved crisis responses + human escalation
4. **User Notification**: "We're experiencing technical difficulties" (never mention model failures)

16.3 Concurrent Requests

**Scenario**: User sends multiple messages simultaneously

**Handling**:
- Process messages sequentially (FIFO queue)
- Return 409 Conflict if thread is locked
- Auto-group messages within 500ms window

16.4 Large Context Windows

**Scenario**: Thread exceeds context limit (>8,192 tokens)

**Handling**:
1. Auto-summarize oldest 50% of messages
2. Keep last 5 messages + summaries
3. Archive old messages to Firestore
4. Notify user: "I've summarized our earlier conversation"

16.5 Crisis Detection During Outage

**Scenario**: User expresses crisis when AI models are unavailable

**Handling**:
1. **Rule-based Keyword Detection**: Always-on (runs before model inference)
2. **Trigger**: Any keyword from crisis list → Immediate resource display
3. **Resources**: Pre-configured crisis hotline numbers + emergency contacts

Database Schema: Calm Sphere Memory Base

This document defines the structured "Memory Base" for Calm Sphere, utilizing Firestore for persistence and Redis for high-speed session memory.

1. Firestore Collection Structure

The database is partitioned into three main domains: Identity, Conversational Memory, and Analytical Signals.

1.1 users Collection

Stores the persistent "Memory Base" for user identity.

Path: /users/{userId}

Document Fields:

{
  "profile": {
    "name": "string",
    "work_role": "string",
    "education": "string",
    "field_of_study": "string",
    "timezone": "string",
    "created_at": "timestamp"
  },
  "preferences": {
    "therapy_pacing": "slow",
    "notification_settings": {}
  }
}


1.2 mental_factors Collection (The Shadow Profile)

Stores the evolving psychological state extracted from interactions.

Path: /users/{userId}/memory_base/mental_factors

Document Fields:

{
  "biological": { "sleep_score": 0.0, "energy_level": 0.0 },
  "psychological": { "coping_effectiveness": 0.0, "stress_tolerance": 0.0 },
  "social": { "connectedness": 0.0, "support_perception": 0.0 },
  "environmental": { "work_pressure": 0.0, "living_stability": 0.0 },
  "last_updated": "timestamp",
  "ema_alpha": 0.3
}


1.3 threads & summaries Collection

Stores the chronological and distilled conversational memory.

Path: /threads/{threadId}

Sub-collection: /threads/{threadId}/messages (The raw chat logs)

Sub-collection: /threads/{threadId}/distillation

{
  "summary_text": "User discussed academic burnout and exam anxiety.",
  "key_emotions_detected": ["anxiety", "exhaustion"],
  "therapeutic_milestones": ["acknowledged need for rest"],
  "completed_at": "timestamp"
}


2. Redis Cache Schema (Volatile Memory)

To achieve sub-1.5s latency, active context is mirrored in Redis.

Key: active_session:{userId}

TTL: 1800 seconds (30 minutes)

Structure:

{
  "identity_snapshot": { "name": "...", "role": "..." },
  "recent_history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "active_factors": { "stress": 0.72, "regulation": 0.45 },
  "thread_id": "string"
}


3. Memory Write Flow (Async Logic)

To keep the "Slow Therapy" feel but fast response times:

Response Phase: FastAPI generates the reply using the Redis snapshot.

Background Phase (The Memory Base Update):

EmotionModel results are averaged into the mental_factors scores.

Llama-3 extracts any new "Profile" facts (e.g., "I just got promoted").

Firestore is updated; Redis is invalidated or refreshed.

4. Retention & Privacy

Decay: Mental factor scores are recalculated weekly to ensure the AI doesn't "hold onto" a past crisis that the user has moved through.

Summarization: Raw messages older than 90 days are archived, leaving only the distillation summaries for the LLM to read.

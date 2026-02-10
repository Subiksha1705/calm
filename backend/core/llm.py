"""
LLM Service for Calm Sphere.

This module provides the AI response generation layer.
Currently uses a mock implementation that can be swapped
with Hugging Face or other LLM providers.

The PRD specifies:
- Provider: Hugging Face Router (OpenAI-compatible)
- Models configurable via environment variables
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import re
from typing import Any, Dict, List, Optional

from core.config import get_settings
from core.huggingface import HuggingFaceInferenceClient


class LLMService:
    """Service for generating AI responses.
    
    This is a mock implementation designed to be replaced
    with actual LLM integration (Hugging Face, OpenAI, etc.)
    
    Attributes:
        store: The conversation store for context
        
    Attributes:
        mock_mode: If True, uses fake responses (development)
        model_name: Name of the LLM model to use
        
    TODO: Implement actual Hugging Face integration:
        - Use Inference API to call the model
        - Build prompt with conversation context
        - Handle rate limits and errors
    """
    
    def __init__(
        self, 
        store: Any | None,
        mock_mode: bool = True,
        model_name: str = "meta-llama/Llama-3.2-3B-Instruct",
        model_response: str | None = None,
        model_emotion: str | None = None,
        model_risk: str | None = None,
        model_analysis: str | None = None,
        enable_emotion: bool = True,
        enable_risk: bool = True,
        hugging_face_api_key: str | None = None,
        hugging_face_base_url: str = "https://router.huggingface.co",
        hugging_face_timeout_s: float = 30.0,
        hugging_face_max_attempts: int = 3,
        hugging_face_backoff_factor: float = 2.0,
    ):
        """Initialize the LLM service.
        
        Args:
            store: The conversation store for accessing thread context
            mock_mode: If True, use fake responses (development only)
            model_name: Name of the LLM model to use
        """
        self._store = store
        self._mock_mode = mock_mode
        self._model_name = model_name
        self._model_response = model_response or model_name
        self._model_emotion = model_emotion or "Qwen/Qwen2.5-7B-Instruct"
        self._model_risk = model_risk or "openai/gpt-oss-safeguard-20b"
        self._model_analysis = model_analysis or "meta-llama/Llama-3.1-70B-Instruct"
        self._enable_emotion = enable_emotion
        self._enable_risk = enable_risk
        self._hugging_face_api_key = hugging_face_api_key
        self._hugging_face_base_url = hugging_face_base_url
        self._hugging_face_timeout_s = hugging_face_timeout_s
        self._hugging_face_max_attempts = hugging_face_max_attempts
        self._hugging_face_backoff_factor = hugging_face_backoff_factor
        self._client: HuggingFaceInferenceClient | None = None
        self._rebuild_client()

    def _rebuild_client(self) -> None:
        if not self._hugging_face_api_key:
            self._client = None
            return
        self._client = HuggingFaceInferenceClient(
            self._hugging_face_api_key,
            base_url=self._hugging_face_base_url,
            timeout_s=self._hugging_face_timeout_s,
            max_attempts=self._hugging_face_max_attempts,
            backoff_factor=self._hugging_face_backoff_factor,
        )

    def set_store(self, store: Any) -> None:
        self._store = store

    def configure(
        self,
        *,
        mock_mode: bool | None = None,
        model_name: str | None = None,
        model_response: str | None = None,
        model_emotion: str | None = None,
        model_risk: str | None = None,
        model_analysis: str | None = None,
        enable_emotion: bool | None = None,
        enable_risk: bool | None = None,
        hugging_face_api_key: str | None = None,
        hugging_face_timeout_s: float | None = None,
        hugging_face_max_attempts: int | None = None,
        hugging_face_backoff_factor: float | None = None,
    ) -> None:
        if mock_mode is not None:
            self._mock_mode = mock_mode
        if model_name is not None:
            self._model_name = model_name
        if model_response is not None:
            self._model_response = model_response
        if model_emotion is not None:
            self._model_emotion = model_emotion
        if model_risk is not None:
            self._model_risk = model_risk
        if model_analysis is not None:
            self._model_analysis = model_analysis
        if enable_emotion is not None:
            self._enable_emotion = enable_emotion
        if enable_risk is not None:
            self._enable_risk = enable_risk
        if hugging_face_api_key is not None:
            self._hugging_face_api_key = hugging_face_api_key
        if hugging_face_timeout_s is not None:
            self._hugging_face_timeout_s = hugging_face_timeout_s
        if hugging_face_max_attempts is not None:
            self._hugging_face_max_attempts = hugging_face_max_attempts
        if hugging_face_backoff_factor is not None:
            self._hugging_face_backoff_factor = hugging_face_backoff_factor
        self._rebuild_client()
    
    def generate_response(
        self, 
        user_id: str, 
        thread_id: str, 
        user_message: str
    ) -> str:
        """Generate a response to a user message.
        
        This method:
        1. Retrieves the conversation history for context
        2. Builds a prompt with system message and history
        3. Calls the LLM to generate a response
        4. Returns the response
        
        Args:
            user_id: The user ID
            thread_id: The thread ID
            user_message: The user's message
            
        Returns:
            The generated response text
        """
        if self._mock_mode:
            return self._generate_mock_response(user_message)
        
        return self._generate_llm_response(user_id, thread_id, user_message)
    
    def _generate_mock_response(self, user_message: str) -> str:
        """Generate a mock response for development.
        
        Args:
            user_message: The user's message
            
        Returns:
            Mock response string
        """
        return f"You said: {user_message}"
    
    def _generate_llm_response(
        self, 
        user_id: str, 
        thread_id: str, 
        user_message: str
    ) -> str:
        """Generate a real LLM response.
        
        TODO: Implement Hugging Face Inference API call.
        
        Args:
            user_id: The user ID
            thread_id: The thread ID
            user_message: The user's message
            
        Returns:
            LLM response string
            
        Raises:
            NotImplementedError: Real LLM integration not yet implemented
        """
        if self._store is None:
            raise RuntimeError("LLMService store not configured")

        if not self._hugging_face_api_key:
            raise RuntimeError(
                "Hugging Face API key not configured. Set HUGGING_FACE_API_KEY (or HF_API_TOKEN)."
            )

        if self._client is None:
            self._rebuild_client()
        if self._client is None:
            raise RuntimeError("Hugging Face client not initialized")
        client = self._client
        history = self._get_thread_history(user_id, thread_id, limit=10)

        if self._enable_risk and self._should_run_risk(user_message, history):
            risk = self._run_risk(client=client, user_message=user_message, history=history)
            if risk.get("overall_risk") == "high":
                return self._high_risk_response()

        emotion: Dict[str, Any] | None = None
        if self._enable_emotion:
            emotion = self._run_emotion(client=client, user_message=user_message)

        return self._run_response(
            client=client,
            user_message=user_message,
            history=history,
            emotion=emotion,
        )
    
    def _get_thread_history(self, user_id: str, thread_id: str, *, limit: int) -> List[Dict[str, str]]:
        thread = self._store.get_thread(user_id, thread_id)
        raw_messages: List[Dict[str, Any]] = (thread or {}).get("messages", [])
        normalized: List[Dict[str, str]] = []
        for msg in raw_messages[-max(limit, 0) :]:
            role = msg.get("role")
            content = msg.get("content")
            if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
                normalized.append({"role": role, "content": content})
        return normalized

    def _should_run_risk(self, user_message: str, history: List[Dict[str, str]]) -> bool:
        text = (user_message or "").lower()
        if len(text) >= 600:
            return True
        keywords = {
            "suicide",
            "kill myself",
            "self harm",
            "self-harm",
            "hurt myself",
            "end it",
            "overdose",
            "die",
        }
        if any(k in text for k in keywords):
            return True
        return False

    def _extract_first_json_object(self, text: str) -> Dict[str, Any]:
        # Best-effort: find the first {...} block and parse it.
        if not text:
            raise ValueError("empty response")
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            raise ValueError("no JSON object found")
        return json.loads(match.group(0))

    def _run_emotion(self, *, client: HuggingFaceInferenceClient, user_message: str) -> Dict[str, Any]:
        system = (
            "You are an emotion classifier.\n"
            "Return ONLY valid JSON with this schema:\n"
            '{"label":"sad|anxious|angry|neutral|happy|overwhelmed|lonely|stressed|other","confidence":0.0}\n'
            "No extra keys, no markdown, no explanations."
        )
        content = client.chat_completions(
            model=self._model_emotion,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_message},
            ],
            max_tokens=200,
            temperature=0.0,
        )
        try:
            payload = self._extract_first_json_object(content)
            label = payload.get("label")
            conf = payload.get("confidence")
            if not isinstance(label, str):
                raise ValueError("missing label")
            if not isinstance(conf, (int, float)):
                raise ValueError("missing confidence")
            return {"label": label, "confidence": float(conf)}
        except Exception:
            return {"label": "other", "confidence": 0.0}

    def _run_risk(
        self,
        *,
        client: HuggingFaceInferenceClient,
        user_message: str,
        history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        system = (
            "You are a safety classifier for a mental health support chatbot.\n"
            "Return ONLY valid JSON with this schema:\n"
            '{"toxicity":0.0,"self_harm":0.0,"harassment":0.0,"sexual":0.0,"violence":0.0,"overall_risk":"low|medium|high"}\n'
            "Use overall_risk='high' if self-harm intent is likely or imminent danger is mentioned.\n"
            "No extra keys, no markdown, no explanations."
        )
        # Provide minimal context (last 2 user messages) to reduce false positives.
        ctx = "\n".join(
            f"{m['role']}: {m['content']}" for m in history[-4:] if m["role"] in {"user", "assistant"}
        )
        content = client.chat_completions(
            model=self._model_risk,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Context:\n{ctx}\n\nNew message:\n{user_message}"},
            ],
            max_tokens=600,
            temperature=0.0,
        )
        try:
            payload = self._extract_first_json_object(content)
            overall = payload.get("overall_risk")
            if overall not in {"low", "medium", "high"}:
                overall = "low"
            return {
                "toxicity": float(payload.get("toxicity", 0.0) or 0.0),
                "self_harm": float(payload.get("self_harm", 0.0) or 0.0),
                "harassment": float(payload.get("harassment", 0.0) or 0.0),
                "sexual": float(payload.get("sexual", 0.0) or 0.0),
                "violence": float(payload.get("violence", 0.0) or 0.0),
                "overall_risk": overall,
            }
        except Exception:
            return {
                "toxicity": 0.0,
                "self_harm": 0.0,
                "harassment": 0.0,
                "sexual": 0.0,
                "violence": 0.0,
                "overall_risk": "low",
            }

    def _run_response(
        self,
        *,
        client: HuggingFaceInferenceClient,
        user_message: str,
        history: List[Dict[str, str]],
        emotion: Dict[str, Any] | None,
    ) -> str:
        emotion_line = ""
        if emotion and isinstance(emotion.get("label"), str) and float(emotion.get("confidence", 0.0) or 0.0) >= 0.4:
            emotion_line = f"\nDetected emotion: {emotion['label']}."

        system = (
            "You are Calm Sphere, a supportive mental health assistant.\n"
            "Be empathetic, calm, and concise.\n"
            "Do not diagnose or give medical advice.\n"
            "Keep your response to 1–3 short paragraphs.\n"
            "If the user asks for a routine, give 3–5 concrete, realistic steps.\n"
            f"{emotion_line}"
        ).strip()

        messages: List[Dict[str, str]] = [{"role": "system", "content": system}]
        # Keep a little context without ballooning costs.
        messages.extend(history[-8:])
        messages.append({"role": "user", "content": user_message})

        return client.chat_completions(
            model=self._model_response,
            messages=messages,
            max_tokens=256,
            temperature=0.7,
        )

    def _high_risk_response(self) -> str:
        return (
            "I’m really sorry you’re feeling this way, and I’m glad you told me.\n\n"
            "If you’re in immediate danger or might harm yourself, please call your local emergency number right now. "
            "If you’re in the U.S., you can call or text 988 (Suicide & Crisis Lifeline).\n\n"
            "If you’re safe right now, can you tell me where you are and whether there’s someone you trust you can reach out to?"
        )

    def analyze_long_text(self, *, text: str) -> str:
        """Run long-context analysis using the configured analysis model.

        This is intentionally not wired to an API route yet; call from future endpoints/jobs.
        """
        if self._mock_mode:
            return "Mock analysis: ok"
        if not self._hugging_face_api_key:
            raise RuntimeError("Hugging Face API key not configured.")

        if self._client is None:
            self._rebuild_client()
        if self._client is None:
            raise RuntimeError("Hugging Face client not initialized")
        client = self._client
        system = (
            "You are an analysis assistant.\n"
            "Summarize key themes, risks, and actionable next steps.\n"
            "Be concise and structured with bullet points."
        )
        return client.chat_completions(
            model=self._model_analysis,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": text}],
            max_tokens=512,
            temperature=0.2,
        )

    def generate_daily_ready_message(self, *, date_key: str) -> str:
        """Generate a short daily greeting for the empty chat state."""
        canned = [
            "Ready when you are.",
            "I'm here for you.",
            "Start when you feel ready.",
            "Take your time today.",
            "Begin wherever feels right.",
        ]
        fallback = canned[abs(hash(date_key)) % len(canned)]

        if self._mock_mode or not self._hugging_face_api_key:
            return fallback

        if self._client is None:
            self._rebuild_client()
        if self._client is None:
            return fallback

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        system = (
            "Write one short, warm opening line for a mental wellness chat app.\n"
            "Constraints:\n"
            "- 2 to 5 words\n"
            "- gentle and encouraging tone\n"
            "- no emojis\n"
            "- no quotation marks\n"
            "- avoid mentioning dates explicitly\n"
            "Return only the single line but should be meaningfully short."
        )
        try:
            content = self._client.chat_completions(
                model=self._model_response,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": f"Generate today's line for {today}."},
                ],
                max_tokens=40,
                temperature=0.8,
            ).strip()
            first_line = (content.splitlines()[0] if content else "").strip().strip('"')
            if not first_line:
                return fallback
            words = first_line.split()
            clamped = " ".join(words[:5]).strip()
            return clamped or fallback
        except Exception:
            return fallback


# Global service instance
_settings = get_settings()
llm_service = LLMService(
    store=None,  # Will be set after store initialization
    mock_mode=_settings.llm_mock_mode,
    model_name=_settings.llm_model,
    model_response=_settings.llm_model_response,
    model_emotion=_settings.llm_model_emotion,
    model_risk=_settings.llm_model_risk,
    model_analysis=_settings.llm_model_analysis,
    enable_emotion=_settings.llm_enable_emotion,
    enable_risk=_settings.llm_enable_risk,
    hugging_face_api_key=_settings.hugging_face_api_key,
    hugging_face_base_url=_settings.hugging_face_base_url,
    hugging_face_timeout_s=_settings.hugging_face_timeout_s,
    hugging_face_max_attempts=_settings.hugging_face_max_attempts,
    hugging_face_backoff_factor=_settings.hugging_face_backoff_factor,
)


__all__ = [
    "LLMService",
    "llm_service",
]

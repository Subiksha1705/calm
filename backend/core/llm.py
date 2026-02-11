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

        try:
            response = self._generate_llm_response(user_id, thread_id, user_message)
            if isinstance(response, str) and response.strip():
                return response.strip()
            return self._safe_fallback_response(user_message=user_message)
        except Exception:
            return self._safe_fallback_response(user_message=user_message)
    
    def _generate_mock_response(self, user_message: str) -> str:
        """Generate a mock response for development.
        
        Args:
            user_message: The user's message
            
        Returns:
            Mock response string
        """
        return f"You said: {user_message}"

    def _safe_fallback_response(self, *, user_message: str) -> str:
        content = (user_message or "").strip()
        if content:
            return (
                "I'm here and listening. I might have missed part of that, but I still want to understand. "
                "Could you tell me a little more about what feels most important right now?"
            )
        return "I'm here with you. Share whatever is on your mind, and we can take it one step at a time."
    
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
            return self._safe_fallback_response(user_message=user_message)

        if not self._hugging_face_api_key:
            return self._safe_fallback_response(user_message=user_message)

        if self._client is None:
            self._rebuild_client()
        if self._client is None:
            return self._safe_fallback_response(user_message=user_message)
        client = self._client
        history = self._get_thread_history(user_id, thread_id, limit=10)

        if self._enable_risk and self._should_run_risk(user_message, history):
            risk = self._run_risk(client=client, user_message=user_message, history=history)
            if risk.get("overall_risk") == "high":
                return self._run_crisis_response(
                    client=client,
                    user_message=user_message,
                    history=history,
                    risk=risk,
                )
            violence_assessment = self._run_violence_intent(
                client=client,
                user_message=user_message,
                history=history,
            )
            if self._should_run_violence_deescalation(
                risk=risk,
                violence_assessment=violence_assessment,
            ):
                return self._run_violence_deescalation_response(
                    client=client,
                    user_message=user_message,
                    history=history,
                    risk=risk,
                )

        emotion: Dict[str, Any] | None = None
        if self._enable_emotion:
            emotion = self._run_emotion(client=client, user_message=user_message)

        return self._run_response(
            client=client,
            user_message=user_message,
            history=history,
            emotion=emotion,
        ) or self._safe_fallback_response(user_message=user_message)
    
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
        # Always run model-based risk analysis when enabled.
        # This avoids brittle keyword matching and lets the model infer intent from context.
        return True

    def _run_user_strengths_analysis(
        self,
        *,
        client: HuggingFaceInferenceClient,
        history: List[Dict[str, str]],
        user_message: str,
        limit: int = 2,
    ) -> List[str]:
        ctx = "\n".join(
            f"{m['role']}: {m['content']}" for m in history[-10:] if m["role"] in {"user", "assistant"}
        )
        system = (
            "You identify user strengths from conversation context for supportive reflection.\n"
            "Return ONLY valid JSON with schema:\n"
            '{"strengths":[string],"confidence":0.0}\n'
            "Rules:\n"
            "- Infer strengths from evidence in text (effort, resilience, values, actions).\n"
            "- Use short phrases.\n"
            "- If no clear evidence, return an empty list.\n"
            "- No markdown, no extra keys."
        )
        content = client.chat_completions(
            model=self._model_analysis,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Context:\n{ctx}\n\nNew user message:\n{user_message}"},
            ],
            max_tokens=180,
            temperature=0.0,
        )
        try:
            payload = self._extract_first_json_object(content)
            conf = float(payload.get("confidence", 0.0) or 0.0)
            if conf < 0.35:
                return []
            raw = payload.get("strengths")
            if not isinstance(raw, list):
                return []
            cleaned = [str(v).strip() for v in raw if str(v).strip()]
            return cleaned[: max(limit, 0)]
        except Exception:
            return []

    def _extract_recent_assistant_messages(self, history: List[Dict[str, str]], *, limit: int = 3) -> List[str]:
        snippets: List[str] = []
        for msg in reversed(history):
            if msg.get("role") != "assistant":
                continue
            content = (msg.get("content") or "").strip()
            if not content:
                continue
            compact = re.sub(r"\s+", " ", content)[:220]
            snippets.append(compact)
            if len(snippets) >= limit:
                break
        return snippets

    def _run_user_pattern_analysis(
        self,
        *,
        client: HuggingFaceInferenceClient,
        history: List[Dict[str, str]],
        user_message: str,
    ) -> Dict[str, List[str]]:
        ctx = "\n".join(
            f"{m['role']}: {m['content']}" for m in history[-8:] if m["role"] in {"user", "assistant"}
        )
        system = (
            "You analyze conversation patterns for a support chatbot.\n"
            "Infer likely repeated patterns from context only. Do not use fixed taxonomies.\n"
            "Return ONLY valid JSON with schema:\n"
            '{"emotions":[string],"reactions":[string],"values":[string],"themes":[string],"confidence":0.0}\n'
            "Rules:\n"
            "- Use short natural-language phrases (2-6 words each).\n"
            "- Prefer repeated signals, not one-off lines.\n"
            "- If uncertain, return empty arrays.\n"
            "- No markdown, no explanations, no extra keys."
        )
        content = client.chat_completions(
            model=self._model_analysis,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Context:\n{ctx}\n\nNew user message:\n{user_message}"},
            ],
            max_tokens=280,
            temperature=0.0,
        )
        try:
            payload = self._extract_first_json_object(content)
            conf = float(payload.get("confidence", 0.0) or 0.0)
            if conf < 0.35:
                return {}
            result: Dict[str, List[str]] = {}
            for key in ("emotions", "reactions", "values", "themes"):
                value = payload.get(key)
                if isinstance(value, list):
                    cleaned = [str(v).strip() for v in value if str(v).strip()]
                    if cleaned:
                        result[key] = cleaned[:3]
            return result
        except Exception:
            return {}

    def _run_violence_intent(
        self,
        *,
        client: HuggingFaceInferenceClient,
        user_message: str,
        history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        ctx = "\n".join(
            f"{m['role']}: {m['content']}" for m in history[-8:] if m["role"] in {"user", "assistant"}
        )
        system = (
            "You are a safety classifier for other-directed violence in chat.\n"
            "Return ONLY valid JSON with schema:\n"
            '{"other_directed_violence":"none|venting|explicit","imminence":"low|medium|high","confidence":0.0}\n'
            "Classify venting when violent language appears as emotional expression without clear plan.\n"
            "Classify explicit when user directly wishes or states harm toward another person.\n"
            "No markdown, no extra keys."
        )
        content = client.chat_completions(
            model=self._model_risk,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Context:\n{ctx}\n\nNew message:\n{user_message}"},
            ],
            max_tokens=180,
            temperature=0.0,
        )
        try:
            payload = self._extract_first_json_object(content)
            cls = payload.get("other_directed_violence")
            imminence = payload.get("imminence")
            conf = float(payload.get("confidence", 0.0) or 0.0)
            if cls not in {"none", "venting", "explicit"}:
                cls = "none"
            if imminence not in {"low", "medium", "high"}:
                imminence = "low"
            return {
                "other_directed_violence": cls,
                "imminence": imminence,
                "confidence": conf,
            }
        except Exception:
            return {
                "other_directed_violence": "none",
                "imminence": "low",
                "confidence": 0.0,
            }

    def _should_run_violence_deescalation(
        self,
        *,
        risk: Dict[str, Any],
        violence_assessment: Dict[str, Any],
    ) -> bool:
        cls = violence_assessment.get("other_directed_violence", "none")
        conf = float(violence_assessment.get("confidence", 0.0) or 0.0)
        violence_score = float(risk.get("violence", 0.0) or 0.0)
        self_harm_score = float(risk.get("self_harm", 0.0) or 0.0)
        if cls in {"venting", "explicit"} and conf >= 0.35:
            return True
        return violence_score >= 0.65 and self_harm_score < 0.4

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
        strengths = self._run_user_strengths_analysis(
            client=client,
            history=history,
            user_message=user_message,
        )
        recent_assistant = self._extract_recent_assistant_messages(history)
        user_patterns = self._run_user_pattern_analysis(
            client=client,
            history=history,
            user_message=user_message,
        )
        strengths_line = ""
        anti_repeat_line = ""
        pattern_line = ""
        if strengths:
            strengths_line = (
                "\nKnown user strengths from prior messages (use gently, no guilt/shaming): "
                + " | ".join(strengths)
            )
        if recent_assistant:
            anti_repeat_line = (
                "\nRecent assistant messages to avoid repeating verbatim: "
                + " | ".join(recent_assistant)
            )
        if user_patterns:
            pattern_parts: List[str] = []
            for key in ("emotions", "reactions", "values", "themes"):
                values = user_patterns.get(key)
                if values:
                    pattern_parts.append(f"{key}: {', '.join(values)}")
            if pattern_parts:
                pattern_line = (
                    "\nObserved user patterns across recent messages (tentative, do not overstate): "
                    + " | ".join(pattern_parts)
                )

        system = (
            "You are Calm Sphere, a supportive mental health assistant.\n"
            "Be empathetic, calm, warm, and concise.\n"
            "Sound like a caring friend while staying emotionally safe and grounded.\n"
            "Do not diagnose or give medical advice.\n"
            "Keep your response to 1–3 short paragraphs.\n"
            "Be a careful listener first: reflect what you heard before offering suggestions.\n"
            "When the user is mistaken, confused, unfair, or self-contradictory, respond politely and gently.\n"
            "Do not scold, shame, or use a superior tone.\n"
            "Use soft language like 'It might help to consider...' or 'Could it be that...'.\n"
            "Prefer collaborative phrasing: 'we can' and 'let's explore'.\n"
            "Understand the user through three lenses over time: feelings, reaction style, and values.\n"
            "Prefer reflective language over labels: say 'I notice...' not 'you are...'.\n"
            "One message can be noise; repeated themes are more meaningful.\n"
            "If jealousy/comparison appears, explore unmet needs (recognition, belonging, worth) without shaming.\n"
            "Validate emotions, but never validate violence, revenge, or harm.\n"
            "If user expresses desire to harm others, do not agree, do not moralize; de-escalate and redirect to underlying feelings.\n"
            "If the user expresses hopelessness, self-harm, or suicidal thoughts:\n"
            "- Acknowledge their pain directly in the first line.\n"
            "- Prioritize immediate safety and ask one clear safety-check question.\n"
            "- Offer one tiny, concrete next step they can do now.\n"
            "- Encourage reaching out to a trusted person or local crisis support.\n"
            "- Never ignore or deflect these signals.\n"
            "When helpful, reference the user's own strengths/achievements from earlier messages to build hope.\n"
            "Do this in a validating way, never as blame, pressure, or guilt.\n"
            "Use fresh wording each turn; do not repeat canned lines.\n"
            "If the user asks for a routine, give 3–5 concrete, realistic steps.\n"
            f"{emotion_line}"
            f"{strengths_line}"
            f"{pattern_line}"
            f"{anti_repeat_line}"
        ).strip()

        messages: List[Dict[str, str]] = [{"role": "system", "content": system}]
        # Keep a little context without ballooning costs.
        messages.extend(history[-8:])
        messages.append({"role": "user", "content": user_message})

        try:
            content = client.chat_completions(
                model=self._model_response,
                messages=messages,
                max_tokens=256,
                temperature=0.7,
            )
            return (content or "").strip()
        except Exception:
            return self._safe_fallback_response(user_message=user_message)

    def _run_crisis_response(
        self,
        *,
        client: HuggingFaceInferenceClient,
        user_message: str,
        history: List[Dict[str, str]],
        risk: Dict[str, Any],
    ) -> str:
        strengths = self._run_user_strengths_analysis(
            client=client,
            history=history,
            user_message=user_message,
            limit=2,
        )
        recent_assistant = self._extract_recent_assistant_messages(history, limit=3)

        strengths_line = ""
        if strengths:
            strengths_line = (
                "User strengths to reference gently when appropriate: "
                + " | ".join(strengths)
            )
        repeat_guard_line = ""
        if recent_assistant:
            repeat_guard_line = (
                "Do not reuse these prior assistant lines or close paraphrases: "
                + " | ".join(recent_assistant)
            )

        system = (
            "You are Calm Sphere, handling a high-risk self-harm/suicide conversation.\n"
            "Write a compassionate, human response that feels present and personal.\n"
            "Never sound scripted or repetitive.\n"
            "Listen first and reflect the user's words before any instruction.\n"
            "If the user is confused or contradictory, keep tone gentle and non-judgmental.\n"
            "Required structure:\n"
            "1) Validate pain in one short sentence.\n"
            "2) Ask one direct safety-check question.\n"
            "3) Offer one immediate, concrete step for the next 5 minutes.\n"
            "4) Encourage contacting trusted support and crisis services.\n"
            "If user location is unknown, say local emergency services; include 988 only as U.S. option.\n"
            "Do not diagnose. Do not moralize. Do not guilt or shame.\n"
            "Keep to 2-4 short paragraphs.\n"
            "Use new wording each turn.\n"
            f"{strengths_line}\n"
            f"{repeat_guard_line}\n"
            f"Risk classifier output: {json.dumps(risk, ensure_ascii=True)}"
        ).strip()

        messages: List[Dict[str, str]] = [{"role": "system", "content": system}]
        messages.extend(history[-8:])
        messages.append({"role": "user", "content": user_message})
        try:
            content = client.chat_completions(
                model=self._model_response,
                messages=messages,
                max_tokens=300,
                temperature=0.8,
            )
            return (content or "").strip() or self._safe_fallback_response(user_message=user_message)
        except Exception:
            return self._safe_fallback_response(user_message=user_message)

    def _run_violence_deescalation_response(
        self,
        *,
        client: HuggingFaceInferenceClient,
        user_message: str,
        history: List[Dict[str, str]],
        risk: Dict[str, Any],
    ) -> str:
        recent_assistant = self._extract_recent_assistant_messages(history, limit=3)
        user_patterns = self._run_user_pattern_analysis(
            client=client,
            history=history,
            user_message=user_message,
        )

        repeat_guard_line = ""
        if recent_assistant:
            repeat_guard_line = (
                "Do not reuse these prior assistant lines or close paraphrases: "
                + " | ".join(recent_assistant)
            )
        pattern_line = ""
        if user_patterns:
            parts: List[str] = []
            for key in ("emotions", "reactions", "values", "themes"):
                values = user_patterns.get(key)
                if values:
                    parts.append(f"{key}: {', '.join(values)}")
            if parts:
                pattern_line = "Observed user patterns (tentative): " + " | ".join(parts)

        system = (
            "You are Calm Sphere, handling a user statement with other-directed violent ideation.\n"
            "Primary rule: validate emotion, never validate harm.\n"
            "Do NOT agree with violence, justify it, or provide harmful suggestions.\n"
            "Do NOT shame the user.\n"
            "Listen and reflect first; keep language polite even when rejecting harm.\n"
            "If user framing is unfair or mistaken, gently reframe without blame.\n"
            "Required structure:\n"
            "1) Acknowledge emotional intensity in one sentence.\n"
            "2) Clearly but calmly reject harm-focused framing.\n"
            "3) Ask one exploratory question about what is underneath (hurt, fear, jealousy, being unseen, betrayal).\n"
            "4) Offer one immediate de-escalation action for the next 5 minutes.\n"
            "Keep response to 2 short paragraphs max.\n"
            "Use soft, human language, not legal or clinical tone.\n"
            f"{pattern_line}\n"
            f"{repeat_guard_line}\n"
            f"Risk classifier output: {json.dumps(risk, ensure_ascii=True)}"
        ).strip()
        messages: List[Dict[str, str]] = [{"role": "system", "content": system}]
        messages.extend(history[-8:])
        messages.append({"role": "user", "content": user_message})
        try:
            content = client.chat_completions(
                model=self._model_response,
                messages=messages,
                max_tokens=260,
                temperature=0.7,
            )
            return (content or "").strip() or self._safe_fallback_response(user_message=user_message)
        except Exception:
            return self._safe_fallback_response(user_message=user_message)

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

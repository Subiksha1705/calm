from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class MeResponse(BaseModel):
    uid: str = Field(description="Authenticated user id (Firebase UID)")
    email: Optional[str] = Field(default=None, description="User email")
    display_name: Optional[str] = Field(default=None, description="User display name")
    photo_url: Optional[str] = Field(default=None, description="User profile photo URL")

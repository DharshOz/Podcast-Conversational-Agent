from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SessionCreateRequest(BaseModel):
    title: Optional[str] = None


class SessionSummary(BaseModel):
    # Allow construction from MongoDB dicts (which include ObjectId _id)
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    session_id: str
    title: str
    created_at: datetime
    updated_at: datetime


class MessageOut(BaseModel):
    # Allow construction from MongoDB message sub-documents
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    role: str
    content: str
    ts: datetime


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    session_id: str
    reply: str
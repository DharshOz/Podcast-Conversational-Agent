from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm

from Backend import users as users_db
from Backend.auth import hash_password, create_access_token, authenticate_user, get_current_user
from Backend.schemas import (
    RegisterRequest, TokenResponse, SessionCreateRequest, SessionSummary,
    MessageOut,     ChatRequest, ChatResponse,
)
from Agent import core, memory
from Agent.guardrails import GuardrailViolation
from Agent.security import RateLimitExceeded

app = FastAPI(title="Podcast RAG Agent API")

# TODO: restrict in production — set allow_origins to your frontend URL only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- auth -----

@app.post("/auth/register", response_model=TokenResponse)
def register(payload: RegisterRequest):
    if users_db.get_user(payload.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    users_db.create_user(payload.username, hash_password(payload.password))
    token = create_access_token(payload.username)
    return TokenResponse(access_token=token)


@app.post("/auth/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token(user["username"])
    return TokenResponse(access_token=token)


# ------------------------------------------------------------ sessions -----

@app.post("/sessions", response_model=SessionSummary)
def new_session(payload: SessionCreateRequest, user: dict = Depends(get_current_user)):
    doc = memory.create_session(user["username"], title=payload.title)
    return SessionSummary(**doc)


@app.get("/sessions", response_model=list[SessionSummary])
def get_sessions(user: dict = Depends(get_current_user)):
    docs = memory.list_sessions(user["username"])
    return [SessionSummary(**d) for d in docs]


@app.get("/sessions/{session_id}/messages", response_model=list[MessageOut])
def get_messages(session_id: str, user: dict = Depends(get_current_user)):
    doc = memory.get_owned_session(session_id, user["username"])
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    return [MessageOut(**m) for m in doc["messages"]]


@app.delete("/sessions/{session_id}")
def remove_session(session_id: str, user: dict = Depends(get_current_user)):
    deleted = memory.delete_session(session_id, user["username"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True}


# ---------------------------------------------------------------- chat -----

@app.post("/sessions/{session_id}/chat", response_model=ChatResponse)
def chat(session_id: str, payload: ChatRequest, user: dict = Depends(get_current_user)):
    try:
        reply = core.handle_turn(session_id, user["username"], payload.message)
    except core.SessionNotFound:
        raise HTTPException(status_code=404, detail="Session not found")
    except GuardrailViolation as e:
        raise HTTPException(status_code=400, detail=f"Blocked: {e.reason}")
    except RateLimitExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))
    return ChatResponse(session_id=session_id, reply=reply)


@app.get("/health")
def health():
    return {"status": "ok"}
"""
Session memory, now keyed by a unique session_id (uuid), owned by user_id.
Collection: sessions
  { session_id, user_id, title, created_at, updated_at, metadata: {...}, messages: [...] }
"""
import uuid
from datetime import datetime, timezone
from .config import db, MAX_HISTORY_MESSAGES

sessions = db["sessions"]
sessions.create_index("user_id")
sessions.create_index("session_id", unique=True)


def create_session(user_id: str, title: str | None = None) -> dict:
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "session_id": session_id,
        "user_id": user_id,
        "title": title or "New conversation",
        "created_at": now,
        "updated_at": now,
        "metadata": {},
        "messages": [],
    }
    sessions.insert_one(doc)
    return doc


def get_session(session_id: str) -> dict | None:
    return sessions.find_one({"session_id": session_id})


def get_owned_session(session_id: str, user_id: str) -> dict | None:
    """Returns the session only if it belongs to this user -- enforces isolation."""
    doc = get_session(session_id)
    if not doc or doc["user_id"] != user_id:
        return None
    return doc


def generate_title_from_message(message: str) -> str:
    clean = " ".join(message.strip().split())
    if not clean:
        return "New conversation"
    if len(clean) <= 45:
        return clean
    truncated = clean[:45].rsplit(" ", 1)[0]
    return (truncated if truncated else clean[:45]) + "..."


def append_message(session_id: str, role: str, content: str):
    entry = {"role": role, "content": content, "ts": datetime.now(timezone.utc)}
    set_fields = {"updated_at": datetime.now(timezone.utc)}

    # Auto-generate title from first user message if title is default 'New conversation'
    if role == "user":
        doc = sessions.find_one({"session_id": session_id})
        if doc and doc.get("title") == "New conversation" and len(doc.get("messages", [])) == 0:
            set_fields["title"] = generate_title_from_message(content)

    sessions.update_one(
        {"session_id": session_id},
        {"$push": {"messages": entry}, "$set": set_fields},
    )


def get_history(session_id: str, limit: int = MAX_HISTORY_MESSAGES) -> list[dict]:
    doc = get_session(session_id)
    if not doc:
        return []
    msgs = doc["messages"][-limit:]
    return [{"role": m["role"], "content": m["content"]} for m in msgs]


def list_sessions(user_id: str) -> list[dict]:
    return list(sessions.find({"user_id": user_id}, {"messages": 0}).sort("updated_at", -1))


def delete_session(session_id: str, user_id: str) -> bool:
    result = sessions.delete_one({"session_id": session_id, "user_id": user_id})
    return result.deleted_count > 0
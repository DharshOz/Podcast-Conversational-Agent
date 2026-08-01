from datetime import datetime, timezone
from Agent.config import db

users = db["users"]
users.create_index("username", unique=True)


def create_user(username: str, password_hash: str) -> dict:
    doc = {
        "username": username,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc),
    }
    users.insert_one(doc)
    return doc


def get_user(username: str) -> dict | None:
    return users.find_one({"username": username})
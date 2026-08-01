"""
Backend auth config lives here (not in agent.config) so JWT settings stay
decoupled from the agent runtime. Shared infra (Mongo, Qdrant, Groq) remains
in agent.config — no circular imports because agent never imports backend.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(_PROJECT_ROOT / ".env")
load_dotenv(_PROJECT_ROOT / "Agent" / ".env")

JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", 60 * 24 * 7))

if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET not found. Set a long random string in .env, e.g. "
        'JWT_SECRET=$(python -c "import secrets; print(secrets.token_hex(32))")'
    )

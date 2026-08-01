import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from pymongo import MongoClient

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(_PROJECT_ROOT / ".env")
load_dotenv(_PROJECT_ROOT / "Agent" / ".env")

# --- LLM (Groq, OpenAI-SDK compatible) ---
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY not found. Check that a .env file exists in your working "
        "directory (or project root) and contains GROQ_API_KEY=your_key_here."
    )

client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
)

# --- MongoDB (single shared connection for users + sessions) ---
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "podcast_agent")

mongo_client = MongoClient(MONGO_URI)
db = mongo_client[MONGO_DB_NAME]

# --- Qdrant Cloud ---
QDRANT_URL = os.environ.get("QDRANT_URL")             # e.g. https://xxxxx.cloud.qdrant.io:6333
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")

if not QDRANT_URL:
    raise RuntimeError(
        "QDRANT_URL not found. Set it in .env to your Qdrant Cloud cluster URL."
    )

EMBED_MODEL_NAME = "BAAI/bge-small-en-v1.5"

MAX_HISTORY_MESSAGES = 20
MAX_TOOL_LOOPS = 5
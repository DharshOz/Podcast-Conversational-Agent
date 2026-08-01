from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchAny
from sentence_transformers import SentenceTransformer
from pathlib import Path
from .config import QDRANT_URL, QDRANT_API_KEY, EMBED_MODEL_NAME, client, GROQ_MODEL

_qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
_embed_model = SentenceTransformer(EMBED_MODEL_NAME)

# Ensure video_id payload index exists for filtering on chunks collection
try:
    _qdrant.create_payload_index("chunks", field_name="video_id", field_schema="keyword")
except Exception:
    pass

_SKILL_PATH = Path(__file__).parent / "skills" / "ship30_writer" / "SKILL.md"
SHIP30_SKILL_PROMPT = _SKILL_PATH.read_text(encoding="utf-8")


def _embed_query(text: str):
    prefixed = f"Represent this sentence for searching relevant passages: {text}"
    return _embed_model.encode([prefixed], normalize_embeddings=True)[0].tolist()


def rag_search(query: str, top_episodes: int = 3, branch_k: int = 10, final_k: int = 6, rrf_k: int = 60) -> list[dict]:
    """Fused two-stage retrieval (episode-scoped + global), combined via RRF."""
    q_vec = _embed_query(query)

    try:
        ep_hits = _qdrant.query_points("episodes", query=q_vec, limit=top_episodes).points
        ep_ids = [h.payload["video_id"] for h in ep_hits if "video_id" in h.payload]
    except Exception:
        ep_ids = []

    filtered = []
    if ep_ids:
        try:
            filtered = _qdrant.query_points(
                "chunks", query=q_vec, limit=branch_k,
                query_filter=Filter(must=[FieldCondition(key="video_id", match=MatchAny(any=ep_ids))]),
            ).points
        except Exception:
            filtered = []

    global_hits = _qdrant.query_points("chunks", query=q_vec, limit=branch_k).points

    scores, payloads = {}, {}
    for rank, h in enumerate(filtered):
        scores[h.id] = scores.get(h.id, 0) + 1 / (rrf_k + rank)
        payloads[h.id] = h.payload
    for rank, h in enumerate(global_hits):
        scores[h.id] = scores.get(h.id, 0) + 1 / (rrf_k + rank)
        payloads[h.id] = h.payload

    ranked = sorted(scores.items(), key=lambda x: -x[1])[:final_k]
    return [payloads[pid] for pid, _ in ranked]


def get_episode_info(video_id: str) -> dict | None:
    """Fetch episode-level metadata by video_id."""
    results, _ = _qdrant.scroll(
        collection_name="episodes",
        scroll_filter=Filter(must=[FieldCondition(key="video_id", match=MatchAny(any=[video_id]))]),
        limit=1,
    )
    return results[0].payload if results else None


def write_ship30_essay(topic: str) -> str:
    """
    Skill-backed tool: gathers grounding material via rag_search, then runs a
    dedicated synthesis call using the Ship 30 for 30 SKILL.md instructions as
    the system prompt (kept separate from the main agent's system prompt so
    it's only loaded when this specific format is requested).
    """
    source_chunks = rag_search(topic, final_k=8)

    if not source_chunks:
        return (
            f"I couldn't find enough transcript material about '{topic}' to write "
            f"a grounded essay. Try a different or broader topic."
        )

    source_material = "\n\n".join(
        f"[{c.get('start_ts', '')} | {c.get('title') or c.get('episode_title', '')}] {c.get('text', '')}" for c in source_chunks
    )

    user_prompt = (
        f"Write the essay now. Topic: {topic}\n\n"
        f"Source material (grounded transcript excerpts -- use these, don't fabricate):\n"
        f"{source_material}"
    )

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SHIP30_SKILL_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    return response.choices[0].message.content


# --- OpenAI/Grok-style tool schemas -----------------------------------------

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "rag_search",
            "description": (
                "Search the podcast transcript knowledge base for passages relevant to a query. "
                "Returns transcript chunks with speaker, timestamp, episode title, and a timestamped YouTube link."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural-language search query"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_episode_info",
            "description": "Get full metadata (title, guest, description, keywords, publish date) for a specific episode by its video_id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "video_id": {"type": "string", "description": "YouTube video ID of the episode"},
                },
                "required": ["video_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_ship30_essay",
            "description": (
                "Write a ~1250-word essay in the Ship 30 for 30 style (strong hook, "
                "heavy bold/bullet formatting for skimmability, clear closing takeaway) "
                "grounded in the podcast transcript knowledge base. Use this instead of "
                "a normal answer whenever the user explicitly asks for an essay, "
                "blog post, or 'Ship 30 for 30 style' writeup."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "The topic or question the essay should be about"},
                },
                "required": ["topic"],
            },
        },
    },
]

TOOL_IMPLEMENTATIONS = {
    "rag_search": rag_search,
    "get_episode_info": get_episode_info,
    "write_ship30_essay": write_ship30_essay,
}
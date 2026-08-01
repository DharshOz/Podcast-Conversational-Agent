# Podcast RAG Conversational Agent

A conversational agent that answers questions about podcast episodes using
retrieval-augmented generation (RAG) over transcript data, with a Ship 30 for 30
essay-writing skill built in. Features multi-user accounts, persistent chat
sessions, and a ChatGPT-style React frontend.

## Tech Stack

- **LLM**: Groq API (OpenAI-SDK compatible)
- **Vector DB**: Qdrant Cloud
- **Embeddings**: `sentence-transformers` (`BAAI/bge-small-en-v1.5`)
- **Session/user store**: MongoDB
- **Backend**: FastAPI, JWT auth (`python-jose`), `bcrypt`
- **Frontend**: React 19, Vite, Tailwind CSS, React Router, `react-markdown`

## Project Structure

```
project-root/
  Agent/            # RAG + agent logic (config, core loop, tools, guardrails, security, memory, skills)
  Backend/          # FastAPI app (main, auth, users, schemas)
  Frontend/         # React + Vite chat UI
  run.py            # Entrypoint -- launches Backend.main:app
  requirements.txt
  .env              # Not committed -- see Environment Variables below
```

---

## Part 1: Building the Knowledge Base (Colab)

The transcript embedding pipeline runs in Google Colab (for free GPU access),
producing a Qdrant vector database that later gets migrated to Qdrant Cloud.

### 1.1 Transcript format

Each episode lives in its own folder under `episodes/`:
```
episodes/
  episode-1/transcript.md
  episode-2/transcript.md
  ...
```
Each `transcript.md` has YAML frontmatter (title, guest, video_id, youtube_url,
description, keywords, etc.) followed by a `## Transcript` section where each
speaker turn is marked `Speaker Name (HH:MM:SS):`, with continuation lines
using just `(HH:MM:SS):`.

### 1.2 Two-layer indexing strategy

- **Layer 1 -- `episodes` collection**: one embedded document per episode,
  built from title + guest + description + keywords. Used for coarse,
  episode-level retrieval.
- **Layer 2 -- `chunks` collection**: transcript turns merged into overlapping
  ~180-word windows (respecting speaker-turn boundaries), each tagged with
  `video_id`, `start_ts`, `speakers`, and a timestamped YouTube link. Used for
  fine-grained passage retrieval.

Retrieval fuses both layers via Reciprocal Rank Fusion (RRF): one branch
searches chunks restricted to the top-matching episodes (precision), another
searches chunks globally with no filter (recall), and the two rankings are
merged.

### 1.3 Running the Colab pipeline

1. Upload/mount your `episodes/` folder into the Colab runtime (e.g. `/content/episodes`).
2. Install dependencies:
   ```python
   !pip install -q qdrant-client sentence-transformers pyyaml tiktoken
   ```
3. Run the notebook cells in order:
   - **Parse transcripts** -- walks `episodes/*/transcript.md`, extracts YAML
     frontmatter + speaker turns.
   - **Chunk turns** -- merges turns into overlapping ~180-word windows.
   - **Load embedding model** -- `BAAI/bge-small-en-v1.5` on GPU if available.
   - **Create local Qdrant collections** -- `episodes` and `chunks`, with
     explicit HNSW config (`m=16, ef_construct=128`).
   - **Embed & upsert** -- embeds both layers and writes them into
     `/content/podcast_qdrant_db` (local/embedded Qdrant mode). This step
     skips and reports any transcript missing required metadata (e.g.
     `video_id`) rather than failing the whole batch.
   - **Retrieval sanity check** -- runs a test query through the fused
     RRF retrieval to confirm results look right before migrating anywhere.

### 1.4 Migrating from Colab to Qdrant Cloud

1. Set up a free Qdrant Cloud cluster at [cloud.qdrant.io](https://cloud.qdrant.io) --
   note the cluster URL and API key.
2. From the same Colab session (or locally, pointing at the downloaded
   `podcast_qdrant_db` folder), run the migration script (`merg.py`):
   - Batches points in small groups (32 at a time) with retries, since
     pushing thousands of vectors in one request tends to time out.
   - Recreates both collections on the cloud cluster with matching vector
     size and HNSW config, then copies every point over.
3. Verify the migration:
   ```python
   from qdrant_client import QdrantClient
   cloud = QdrantClient(url="<QDRANT_URL>", api_key="<QDRANT_API_KEY>")
   print(cloud.get_collections())
   print(cloud.count("episodes"), cloud.count("chunks"))
   ```

**Important**: the embedding model used for querying at runtime
(`BAAI/bge-small-en-v1.5` in `Agent/tools.py`) must match whatever model
embedded the data in Colab -- mismatched models produce vectors in different
spaces and retrieval silently returns nonsense.

---

## Part 2: Environment Setup

Create a `.env` file in the project root:

```env
# LLM
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b

# MongoDB
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=podcast_agent

# Qdrant Cloud
QDRANT_URL=https://xxxxx.cloud.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key

# Auth
JWT_SECRET=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
JWT_EXPIRE_MINUTES=10080
```

Install backend dependencies:
```bash
pip install -r requirements.txt
```

---

## Part 3: Running the Project

### Backend
```bash
python run.py
```
This launches the FastAPI app (`Backend.main:app`) on `http://localhost:8000`.
Interactive API docs are available at `http://localhost:8000/docs`.

### Frontend
```bash
cd Frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### First-time use
1. Register an account from the login screen.
2. Click "New conversation."
3. Ask a question about the podcast content, or ask for an essay in "Ship 30
   for 30 style" on a topic covered in the transcripts to trigger the essay
   skill.

---

## API Reference

| Method | Endpoint                        | Auth | Description                          |
|--------|----------------------------------|------|---------------------------------------|
| POST   | `/auth/register`                | No   | Create account, returns JWT           |
| POST   | `/auth/login`                   | No   | Log in (form-encoded), returns JWT    |
| POST   | `/sessions`                     | Yes  | Create a new conversation             |
| GET    | `/sessions`                     | Yes  | List the user's conversations         |
| GET    | `/sessions/{session_id}/messages` | Yes | Get full message history            |
| POST   | `/sessions/{session_id}/chat`   | Yes  | Send a message, get the agent's reply |
| DELETE | `/sessions/{session_id}`        | Yes  | Delete a conversation                 |

All authenticated endpoints require `Authorization: Bearer <token>`.

---

## Notes & Known Limitations

- Chat responses are synchronous (no streaming) -- the full reply, including
  any tool-calling round-trips, returns in one response, which can take a
  few seconds.
- CORS is currently wide open (`allow_origins=["*"]`) for local development --
  restrict this before deploying anywhere public.
- The Ship 30 for 30 essay skill (`Agent/skills/ship30_writer/SKILL.md`)
  targets ~1250 words but LLM output length naturally varies (~1000-1500).

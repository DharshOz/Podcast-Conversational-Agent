"""
Project entrypoint — runs from the project root.

Activate the venv first:
    .\\conversational_AI\\Scripts\\activate

Then start the server either via:
    python run.py

Or directly:
    uvicorn Backend.main:app --reload --port 8000
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("Backend.main:app", host="127.0.0.1", port=8000, reload=True)

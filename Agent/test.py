from config import QDRANT_PATH
from qdrant_client import QdrantClient

client = QdrantClient(path=QDRANT_PATH)
print("Path:", QDRANT_PATH)
print("Collections:", client.get_collections())
print("Chunk count:", client.count("chunks"))
print("Episode count:", client.count("episodes"))
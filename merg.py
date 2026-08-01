from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, HnswConfigDiff

local = QdrantClient(path="./podcast_qdrant_db")
cloud = QdrantClient(url="QDRANT URL", api_key="QDRANT KEY",timeout=300)

from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, HnswConfigDiff, PointStruct
import os, time
from dotenv import load_dotenv



UPLOAD_BATCH_SIZE = 32   # smaller batches survive slow/flaky connections better
MAX_RETRIES = 5


def upsert_with_retry(collection_name, points):
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            cloud.upsert(collection_name=collection_name, points=points)
            return
        except Exception as e:
            wait = 2 ** attempt
            print(f"    retry {attempt}/{MAX_RETRIES} after error: {e} -- waiting {wait}s")
            time.sleep(wait)
    raise RuntimeError(f"Failed to upsert batch into {collection_name} after {MAX_RETRIES} retries")


for name in ["episodes", "chunks"]:
    info = local.get_collection(name)
    vec_size = info.config.params.vectors.size

    if not cloud.collection_exists(name):
        cloud.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=vec_size, distance=Distance.COSINE),
            hnsw_config=HnswConfigDiff(m=16, ef_construct=128),
        )

    all_points, offset = [], None
    while True:
        batch, offset = local.scroll(name, limit=256, offset=offset, with_vectors=True)
        if not batch:
            break
        all_points.extend(batch)
        if offset is None:
            break

    print(f"{name}: {len(all_points)} points to migrate")

    for i in range(0, len(all_points), UPLOAD_BATCH_SIZE):
        chunk = all_points[i:i + UPLOAD_BATCH_SIZE]
        points = [PointStruct(id=p.id, vector=p.vector, payload=p.payload) for p in chunk]
        t0 = time.time()
        upsert_with_retry(name, points)
        elapsed = time.time() - t0
        done = min(i + UPLOAD_BATCH_SIZE, len(all_points))
        print(f"  {name}: uploaded {done}/{len(all_points)} ({elapsed:.1f}s for this batch)")

    cloud_count = cloud.count(name).count
    print(f"{name}: done -- cloud collection now has {cloud_count} points")

print("Migration complete.")
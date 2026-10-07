"""Pinecone vector store operations for resume embeddings."""

import os
from typing import Any
from dotenv import load_dotenv

load_dotenv()


def get_pinecone_index():
    """Get or create the Pinecone index for EVA Speak."""
    api_key = os.getenv("PINECONE_API_KEY")
    index_name = os.getenv("PINECONE_INDEX_NAME", "eva-speak")

    if not api_key:
        raise RuntimeError("PINECONE_API_KEY environment variable is required.")

    try:
        from pinecone import Pinecone, ServerlessSpec
    except ImportError:
        raise RuntimeError("pinecone-client is not installed. Run: pip install pinecone-client")

    pc = Pinecone(api_key=api_key)

    # Create index if it doesn't exist
    existing_indexes = [idx.name for idx in pc.list_indexes()]
    if index_name not in existing_indexes:
        pc.create_index(
            name=index_name,
            dimension=1024,  # llama-text-embed-v2 dimension
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )

    return pc.Index(index_name)


def upsert_chunks(
    chunks: list[str],
    embeddings: list[list[float]],
    namespace: str,
    metadata: dict[str, Any] | None = None,
) -> int:
    """Upsert resume chunks into Pinecone."""
    index = get_pinecone_index()

    vectors = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        vector_id = f"{namespace}-chunk-{i}"
        meta = {
            "text": chunk,
            "chunk_index": i,
            "namespace": namespace,
            **(metadata or {}),
        }
        vectors.append({"id": vector_id, "values": embedding, "metadata": meta})

    # Upsert in batches of 100
    batch_size = 100
    for start in range(0, len(vectors), batch_size):
        batch = vectors[start : start + batch_size]
        index.upsert(vectors=batch, namespace=namespace)

    return len(vectors)


def query_resume(
    query_embedding: list[float],
    namespace: str,
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """Query Pinecone for relevant resume chunks."""
    index = get_pinecone_index()

    results = index.query(
        vector=query_embedding,
        namespace=namespace,
        top_k=top_k,
        include_metadata=True,
    )

    return [
        {
            "text": match.metadata.get("text", ""),
            "score": match.score,
            "chunk_index": match.metadata.get("chunk_index", 0),
        }
        for match in results.matches
    ]


def delete_namespace(namespace: str) -> None:
    """Delete all vectors in a namespace."""
    try:
        index = get_pinecone_index()
        index.delete(delete_all=True, namespace=namespace)
    except Exception:
        pass  # Non-critical cleanup

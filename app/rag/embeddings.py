"""Embeddings — generate vector embeddings for resume chunks using Pinecone Inference with Ollama fallback."""

import logging
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


def get_embedding_model(model: str = "llama-text-embed-v2"):
    """Get the primary embedding model (Pinecone Inference) or fallback (Ollama)."""
    pinecone_key = os.getenv("PINECONE_API_KEY")

    if pinecone_key:
        try:
            from langchain_pinecone import PineconeEmbeddings

            return PineconeEmbeddings(
                model=model,
                pinecone_api_key=pinecone_key,
            )
        except Exception as e:
            logger.warning("PineconeEmbeddings initialization failed, switching to Ollama backup: %s", e)

    # Fallback to local Ollama
    try:
        from langchain_ollama import OllamaEmbeddings

        ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        return OllamaEmbeddings(
            model=model,
            base_url=ollama_base_url,
        )
    except ImportError:
        raise RuntimeError(
            "Embedding initialization failed: PINECONE_API_KEY is missing or invalid, "
            "and langchain-ollama is not installed. Run: pip install langchain-pinecone langchain-ollama"
        )


def get_embeddings(texts: list[str], model: str = "llama-text-embed-v2") -> list[list[float]]:
    """Generate embeddings using Pinecone Inference with Ollama fallback."""
    embeddings_model = get_embedding_model(model=model)
    return embeddings_model.embed_documents(texts)


def get_query_embedding(query: str, model: str = "llama-text-embed-v2") -> list[float]:
    """Generate a query embedding using Pinecone Inference with Ollama fallback."""
    embeddings_model = get_embedding_model(model=model)
    return embeddings_model.embed_query(query)


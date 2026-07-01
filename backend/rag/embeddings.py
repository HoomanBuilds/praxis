"""Local sentence-transformers embedding model (proposal §7.4).

``all-mpnet-base-v2`` produces 768-dimensional dense vectors and runs entirely locally,
so no regulatory content leaves the client boundary (§10.4). The model is loaded lazily
and cached process-wide because initialisation is expensive.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Sequence

from config import settings


@lru_cache(maxsize=1)
def get_embedder():
    # Imported lazily so importing this module is cheap and doesn't pull torch at import time.
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(settings.embedding_model)


def embed_texts(texts: Sequence[str]) -> list[list[float]]:
    if not texts:
        return []
    model = get_embedder()
    vectors = model.encode(list(texts), normalize_embeddings=True, show_progress_bar=False)
    return [v.tolist() for v in vectors]


def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]


def embedding_dimension() -> int:
    return get_embedder().get_sentence_embedding_dimension()

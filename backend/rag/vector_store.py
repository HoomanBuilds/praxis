"""ChromaDB vector store wrapper (proposal §5.2.3, §7.4).

Supports two deployment modes transparently:
  * embedded ``PersistentClient`` (no CHROMA_HOST set) for CLI / tests / single-process dev;
  * ``HttpClient`` against the chromadb container when CHROMA_HOST is set (docker compose).

We pass *precomputed* embeddings from our local sentence-transformers model rather than
relying on Chroma's default embedder, keeping the embedding model under our control and
on-prem. Two logical collections exist: the regulatory corpus and the extracted-obligation
index used for cross-reference search (§7.4).
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Optional

from config import settings
from rag import embeddings as emb
from rag.chunking import Chunk

CORPUS_COLLECTION = "regulatory_corpus"
OBLIGATION_COLLECTION = "obligation_index"


@dataclass
class Hit:
    id: str
    text: str
    metadata: dict
    score: float  # cosine similarity in [0, 1]; higher is better


@lru_cache(maxsize=1)
def get_client():
    import chromadb

    if settings.chroma_host:
        return chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
    return chromadb.PersistentClient(path=settings.chroma_path)


def get_collection(name: str):
    return get_client().get_or_create_collection(
        name=name, metadata={"hnsw:space": "cosine"}
    )


def reset_collection(name: str) -> None:
    client = get_client()
    try:
        client.delete_collection(name)
    except Exception:
        pass
    client.get_or_create_collection(name=name, metadata={"hnsw:space": "cosine"})


def add_chunks(collection_name: str, chunks: list[Chunk]) -> int:
    if not chunks:
        return 0
    collection = get_collection(collection_name)
    vectors = emb.embed_texts([c.context_prefix() for c in chunks])
    collection.upsert(
        ids=[c.chunk_id for c in chunks],
        documents=[c.text for c in chunks],
        metadatas=[c.metadata() for c in chunks],
        embeddings=vectors,
    )
    return len(chunks)


def add_texts(
    collection_name: str, ids: list[str], texts: list[str], metadatas: list[dict]
) -> int:
    if not ids:
        return 0
    collection = get_collection(collection_name)
    vectors = emb.embed_texts(texts)
    collection.upsert(ids=ids, documents=texts, metadatas=metadatas, embeddings=vectors)
    return len(ids)


def query(
    collection_name: str,
    query_text: str,
    n_results: int = 6,
    where: Optional[dict] = None,
) -> list[Hit]:
    collection = get_collection(collection_name)
    count = collection.count()
    if count == 0:
        return []
    vector = emb.embed_query(query_text)
    res = collection.query(
        query_embeddings=[vector],
        n_results=min(n_results, count),
        where=where,
        include=["documents", "metadatas", "distances"],
    )
    hits: list[Hit] = []
    ids = res.get("ids", [[]])[0]
    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    dists = res.get("distances", [[]])[0]
    for i, _id in enumerate(ids):
        distance = dists[i] if i < len(dists) else 1.0
        hits.append(
            Hit(
                id=_id,
                text=docs[i] if i < len(docs) else "",
                metadata=metas[i] if i < len(metas) else {},
                score=max(0.0, 1.0 - float(distance)),  # cosine distance -> similarity
            )
        )
    return hits


def all_documents(collection_name: str) -> list[Hit]:
    """Return every stored item (used to build the BM25 sparse index)."""
    collection = get_collection(collection_name)
    if collection.count() == 0:
        return []
    res = collection.get(include=["documents", "metadatas"])
    hits = []
    for i, _id in enumerate(res.get("ids", [])):
        hits.append(
            Hit(
                id=_id,
                text=res["documents"][i],
                metadata=res["metadatas"][i],
                score=0.0,
            )
        )
    return hits

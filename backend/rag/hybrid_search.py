"""Hybrid retrieval: dense (ChromaDB) + sparse (BM25), merged with Reciprocal Rank
Fusion (proposal §7.5).

Dense search captures semantic relevance; BM25 captures exact regulatory terminology,
circular numbers and defined terms that embeddings may not preserve. RRF combines the two
rankings without needing to calibrate score scales, and consistently outperforms either
method alone on recall of specific references.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from config import settings
from rag import vector_store
from rag.vector_store import Hit

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


@dataclass
class FusedHit:
    id: str
    text: str
    metadata: dict
    rrf_score: float
    dense_rank: int | None = None
    sparse_rank: int | None = None


def _bm25_rank(collection_name: str, query_text: str, top_n: int) -> list[Hit]:
    from rank_bm25 import BM25Okapi

    corpus_hits = vector_store.all_documents(collection_name)
    if not corpus_hits:
        return []
    tokenized = [_tokenize(h.text) for h in corpus_hits]
    bm25 = BM25Okapi(tokenized)
    scores = bm25.get_scores(_tokenize(query_text))
    ranked = sorted(zip(corpus_hits, scores), key=lambda x: x[1], reverse=True)
    out = []
    for hit, score in ranked[:top_n]:
        hit.score = float(score)
        out.append(hit)
    return out


def hybrid_search(
    collection_name: str,
    query_text: str,
    top_k: int | None = None,
) -> list[FusedHit]:
    top_k = top_k or settings.retrieval_top_k
    pool = max(top_k * 2, 10)
    k = settings.rrf_k

    dense = vector_store.query(collection_name, query_text, n_results=pool)
    sparse = _bm25_rank(collection_name, query_text, top_n=pool)

    fused: dict[str, FusedHit] = {}

    def _ensure(hit: Hit) -> FusedHit:
        if hit.id not in fused:
            fused[hit.id] = FusedHit(
                id=hit.id, text=hit.text, metadata=hit.metadata, rrf_score=0.0
            )
        return fused[hit.id]

    for rank, hit in enumerate(dense):
        fh = _ensure(hit)
        fh.dense_rank = rank
        fh.rrf_score += 1.0 / (k + rank + 1)
    for rank, hit in enumerate(sparse):
        fh = _ensure(hit)
        fh.sparse_rank = rank
        fh.rrf_score += 1.0 / (k + rank + 1)

    ranked = sorted(fused.values(), key=lambda f: f.rrf_score, reverse=True)
    return ranked[:top_k]

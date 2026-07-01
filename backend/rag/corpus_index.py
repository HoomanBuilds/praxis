"""Build and maintain the regulatory corpus index (proposal §7.4).

At system initialisation the curated corpus of SEBI circulars (data/corpus/*.pdf) is
parsed, structure-aware chunked, embedded and stored in ChromaDB. The index is updated
incrementally as new circulars are processed. A second collection indexes extracted
obligations to support the cross-reference logic of the Obligation Extraction Agent.
"""
from __future__ import annotations

from pathlib import Path

from agents.parser import parse_document
from config import settings
from rag import vector_store
from rag.chunking import Chunk, chunk_document


def _corpus_titles() -> dict[str, dict]:
    """Best-effort slug -> {reference, title} map from the seed metadata, for richer
    chunk metadata. Returns empty if the seed module isn't importable."""
    try:
        import importlib.util

        seed_path = Path(settings.corpus_path).parent / "seed" / "circulars.py"
        spec = importlib.util.spec_from_file_location("praxis_seed_circulars", seed_path)
        module = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
        spec.loader.exec_module(module)  # type: ignore[union-attr]
        return {c["slug"]: {"reference": c["reference"], "title": c["title"]} for c in module.CIRCULARS}
    except Exception:
        return {}


def index_corpus(reset: bool = True) -> int:
    """(Re)build the corpus collection from every PDF in the corpus directory."""
    if reset:
        vector_store.reset_collection(vector_store.CORPUS_COLLECTION)

    titles = _corpus_titles()
    corpus_dir = Path(settings.corpus_path)
    total = 0
    for pdf in sorted(corpus_dir.glob("*.pdf")):
        slug = pdf.stem
        parsed = parse_document(str(pdf))
        chunks = chunk_document(slug, parsed)
        _add_with_meta(chunks, titles)
        total += len(chunks)
        print(f"  indexed {slug}: {len(chunks)} chunks (parse_quality={parsed.parse_quality})")
    print(f"Corpus indexed: {total} chunks from {corpus_dir}")
    return total


def _add_with_meta(chunks: list[Chunk], titles: dict[str, dict]) -> None:
    if not chunks:
        return
    collection = vector_store.get_collection(vector_store.CORPUS_COLLECTION)
    from rag import embeddings as emb

    vectors = emb.embed_texts([c.context_prefix() for c in chunks])
    metadatas = []
    for c in chunks:
        m = c.metadata()
        info = titles.get(c.document_id, {})
        m["source_slug"] = c.document_id
        m["reference"] = info.get("reference", c.document_id)
        m["title"] = info.get("title", c.document_id)
        metadatas.append(m)
    collection.upsert(
        ids=[c.chunk_id for c in chunks],
        documents=[c.text for c in chunks],
        metadatas=metadatas,
        embeddings=vectors,
    )


def index_obligation(obligation_id: str, text: str, metadata: dict) -> None:
    """Add an approved/extracted obligation to the obligation index for cross-reference search."""
    vector_store.add_texts(
        vector_store.OBLIGATION_COLLECTION,
        ids=[obligation_id],
        texts=[text],
        metadatas=[metadata],
    )


def corpus_size() -> int:
    return vector_store.get_collection(vector_store.CORPUS_COLLECTION).count()

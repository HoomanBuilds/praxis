import pytest

from config import settings
from rag import vector_store
from rag.chunking import Chunk
from rag.hybrid_search import hybrid_search


@pytest.fixture
def temp_chroma(tmp_path):
    settings.chroma_host = ""
    settings.chroma_path = str(tmp_path / "chroma")
    vector_store.get_client.cache_clear()
    yield
    vector_store.get_client.cache_clear()


def test_hybrid_search_returns_most_relevant_chunk(temp_chroma):
    chunks = [
        Chunk("c1", "margin", "Every stock broker shall collect upfront margin before any trade.",
              section_label="2", heading="Margin"),
        Chunk("c2", "cyber", "The intermediary shall report cyber incidents within six hours of detection.",
              section_label="4", heading="Incident Reporting"),
        Chunk("c3", "kyc", "KYC records of high risk clients shall be updated every two years.",
              section_label="2", heading="Periodicity"),
    ]
    vector_store.reset_collection(vector_store.CORPUS_COLLECTION)
    vector_store.add_chunks(vector_store.CORPUS_COLLECTION, chunks)

    hits = hybrid_search(vector_store.CORPUS_COLLECTION, "cyber attack reporting deadline", top_k=1)
    assert hits and hits[0].id == "c2"

    hits2 = hybrid_search(vector_store.CORPUS_COLLECTION, "how often to refresh KYC for risky clients", top_k=1)
    assert hits2 and hits2[0].id == "c3"


def test_exact_term_recall_via_sparse(temp_chroma):
    chunks = [
        Chunk("x1", "d", "The Recovery Time Objective shall not exceed forty-five minutes.",
              section_label="2", heading="BCP"),
        Chunk("x2", "d", "Clients must be intimated thirty days before the due date.",
              section_label="3", heading="Notice"),
    ]
    vector_store.reset_collection(vector_store.CORPUS_COLLECTION)
    vector_store.add_chunks(vector_store.CORPUS_COLLECTION, chunks)
    hits = hybrid_search(vector_store.CORPUS_COLLECTION, "Recovery Time Objective", top_k=1)
    assert hits and hits[0].id == "x1"

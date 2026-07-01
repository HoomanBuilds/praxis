"""PRAXIS command-line interface.

A no-worker development/demo path that exercises the full pipeline:

    python -m cli health
    python -m cli index-corpus
    python -m cli ingest data/corpus/margin_pledge.pdf
    python -m cli process <document_id>
    python -m cli obligations <document_id>
    python -m cli generate <document_id> --auto-approve
    python -m cli audit --obligation <obligation_id>
    python -m cli run data/corpus/margin_pledge.pdf --auto-approve   # all of the above
"""
from __future__ import annotations

import typer
from rich.console import Console
from rich.table import Table

import services
from agents import audit_report
from db import crud
from db.session import init_db, session_scope
from rag import corpus_index

app = typer.Typer(add_completion=False, help="PRAXIS / RegPilot — agentic compliance pipeline")
console = Console()


@app.command()
def health():
    """Check the LLM host and corpus index."""
    from llm import health_check

    info = health_check()
    console.print(f"[bold]LLM[/bold]: provider={info['provider']} model={info['model']} available={info['available']}")
    console.print(f"[bold]Models[/bold]: {info['models']}")
    init_db()
    console.print(f"[bold]Corpus chunks indexed[/bold]: {corpus_index.corpus_size()}")


@app.command(name="index-corpus")
def index_corpus_cmd(reset: bool = typer.Option(True, help="Rebuild from scratch")):
    """Parse, chunk, embed and index the curated SEBI corpus into ChromaDB."""
    n = corpus_index.index_corpus(reset=reset)
    console.print(f"[green]Indexed {n} chunks.[/green]")


@app.command()
def initdb():
    """Create database tables."""
    init_db()
    console.print("[green]Database initialised.[/green]")


@app.command()
def ingest(
    path: str,
    reference: str = typer.Option("", help="Circular reference number"),
    title: str = typer.Option("", help="Circular title"),
):
    """Ingest a circular PDF into the document store."""
    init_db()
    with session_scope() as session:
        doc, created = services.ingest_file(session, path, reference=reference, title=title)
        status = "ingested" if created else "already present (dedup)"
        console.print(f"[green]Document {status}[/green]: id=[bold]{doc.id}[/bold] ref={doc.reference}")


@app.command()
def process(document_id: str):
    """Run Phase A (parse → regulation → obligation extraction)."""
    init_db()
    with session_scope() as session:
        result = services.process_document(session, document_id)
    console.print(result)


@app.command()
def obligations(document_id: str):
    """List extracted obligations for a document with provenance."""
    init_db()
    with session_scope() as session:
        rows = crud.list_obligations(session, document_id=document_id)
        table = Table(title=f"Obligations — {document_id}")
        for col in ("Identifier", "Area", "Conf", "Status", "Para", "Description"):
            table.add_column(col, overflow="fold")
        for o in rows:
            table.add_row(
                o.identifier, o.functional_area, f"{o.confidence:.2f}", o.status,
                o.source_paragraph_ref or "-", o.description[:70],
            )
        console.print(table)


@app.command()
def approve(obligation_id: str, reviewer: str = "compliance_officer"):
    """Approve a single obligation (human-in-the-loop gate)."""
    init_db()
    with session_scope() as session:
        ob = crud.get_obligation(session, obligation_id)
        if not ob:
            raise typer.BadParameter("Obligation not found")
        crud.review_obligation(session, ob, approve=True, reviewer=reviewer)
    console.print(f"[green]Approved[/green] {obligation_id}")


@app.command()
def generate(
    document_id: str,
    auto_approve: bool = typer.Option(False, "--auto-approve", help="Approve all pending obligations first (demo)"),
):
    """Run Phase B (rule → workflow → evidence) on approved obligations."""
    init_db()
    with session_scope() as session:
        result = services.generate_for_document(session, document_id, auto_approve=auto_approve)
    console.print(result)


@app.command()
def audit(
    obligation: str = typer.Option("", "--obligation", help="Obligation id"),
    document: str = typer.Option("", "--document", help="Document id"),
):
    """Generate an audit package (PDF + XLSX)."""
    init_db()
    scope = "obligation" if obligation else "document" if document else "firm"
    with session_scope() as session:
        pkg = audit_report.build_audit_package(
            session, scope=scope, obligation_id=obligation or None, document_id=document or None
        )
    console.print(f"[green]Audit package[/green] scope={pkg['scope']} obligations={pkg['obligation_count']}")
    console.print(f"Files: {pkg['files']}")


@app.command()
def run(
    path: str,
    auto_approve: bool = typer.Option(True, "--auto-approve/--no-auto-approve"),
):
    """Convenience: ingest → process → generate → audit a single circular end-to-end."""
    init_db()
    if corpus_index.corpus_size() == 0:
        console.print("[yellow]Corpus empty — indexing first…[/yellow]")
        corpus_index.index_corpus(reset=True)
    with session_scope() as session:
        doc, _ = services.ingest_file(session, path)
        doc_id = doc.id
    console.print(f"Ingested document [bold]{doc_id}[/bold]")
    with session_scope() as session:
        console.print(services.process_document(session, doc_id))
    with session_scope() as session:
        console.print(services.generate_for_document(session, doc_id, auto_approve=auto_approve))
    with session_scope() as session:
        pkg = audit_report.build_audit_package(session, scope="document", document_id=doc_id)
    console.print(f"[green]Done.[/green] Audit files: {pkg['files']}")


if __name__ == "__main__":
    app()

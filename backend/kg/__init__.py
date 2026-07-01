"""Compliance knowledge graph (Layer 6).

Projects the relational compliance store into a graph of
Regulation → Obligation → Department → Task → Owner / Evidence, plus cross-document
MODIFIES edges that capture regulatory supersession. Because it is a projection over the
system of record, it is inherently incremental: only obligations that the diff engine
actually (re)processed appear or change, so a new circular updates only the affected nodes.
"""

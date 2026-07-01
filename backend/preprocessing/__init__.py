"""Pre-processing funnel that sits in front of the LLM agent layer.

Enterprise RegTech does not run a language model over every page of a 400-page master
circular. This package implements the funnel that makes the pipeline scale:

    parse → classify (drop TOC/definitions/annexures) → diff (skip unchanged sections)
          → deterministic rule extraction (regex) → LLM only for genuinely ambiguous sections

so the expensive model is reserved for the small fraction of content that actually needs
reasoning (proposal §7.1 — "accuracy over comprehensiveness").
"""

/**
 * A single normalized view-model for "how a circular was processed".
 *
 * Three screens showed this: Command Center, Review and Analytics. They diverged because
 * the copy lived at three call sites — and because they read genuinely different shapes:
 * Dashboard/Review read one document's `Funnel`, while Analytics aggregates across
 * documents into its own accumulator. Hence adapters into a common shape rather than
 * passing `Funnel` around directly.
 */
import type { Funnel } from "@/lib/types";

export interface PipelineStats {
  /** Sections read out of the source document. */
  sections: number;
  /** Sections judged regulatory and worth extracting from. */
  candidates: number;
  /** Handled by the rule engine with no AI call. */
  automatic: number;
  /** Sections that needed AI interpretation. */
  aiReviewed: number;
  /** Total AI calls made. */
  aiCalls: number;
  /** Unchanged clauses skipped (master circulars only). */
  skipped?: number;
  /** AI calls a naive implementation would have made — for the savings figure. */
  naive?: number;
}

/** One document's funnel — Command Center and Review. */
export function fromDocumentFunnel(f: Funnel): PipelineStats {
  return {
    sections: f.total_sections,
    candidates: f.candidates,
    automatic: f.deterministic_sections,
    aiReviewed: f.llm_sections,
    aiCalls: f.llm_calls,
    skipped: f.diff?.unchanged_skipped,
  };
}

/** The cross-document accumulator built by Analytics. */
export function fromAggregate(agg: {
  sections: number;
  candidates: number;
  deterministic: number;
  llm_calls: number;
  naive: number;
}): PipelineStats {
  return {
    sections: agg.sections,
    candidates: agg.candidates,
    automatic: agg.deterministic,
    aiReviewed: agg.llm_calls,
    aiCalls: agg.llm_calls,
    naive: agg.naive,
  };
}

/** Share of regulatory sections handled with no AI involvement. 0 when nothing processed. */
export function automationRate(s: PipelineStats): number {
  if (!s.candidates) return 0;
  return Math.round((s.automatic / s.candidates) * 100);
}

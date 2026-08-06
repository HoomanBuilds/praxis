import { Badge } from "@/components/ui/badge";
import { useVocab } from "@/hooks/useVocab";
import { titleCase } from "@/lib/utils";

/**
 * How an obligation was identified. This is a provenance signal a regulator legitimately
 * needs, so the distinction stays — only the vocabulary changes (business mode reads
 * "Automatic"/"Standard Analysis"; engineering mode reads "Deterministic"/"LLM").
 */
export function MethodBadge({ method }: { method: string }) {
  const { t, e } = useVocab();
  const isRule = method === "deterministic";
  return (
    <Badge
      variant={isRule ? "secondary" : "outline"}
      title={t(isRule ? "obligation.method.rule.tip" : "obligation.method.ai.tip")}
    >
      {isRule ? "⚙" : "✦"} {e("extraction.method", method)}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { e } = useVocab();
  const map: Record<string, "success" | "warning" | "destructive" | "muted" | "default"> = {
    approved: "success",
    edited: "success",
    pending_review: "warning",
    rejected: "destructive",
    completed: "success",
    in_progress: "warning",
    not_started: "muted",
    awaiting_review: "warning",
    ingested: "muted",
    extracting: "warning",
    generating: "warning",
    extraction_failed: "destructive",
    needs_human_parse: "warning",
    failed: "destructive",
  };
  // Document lifecycle values get business phrasing; obligation/task statuses are already
  // plain English and fall through to title case.
  const label = DOC_STATUSES.has(status) ? e("document.status", status) : titleCase(status);
  return <Badge variant={map[status] ?? "muted"}>{label}</Badge>;
}

const DOC_STATUSES = new Set([
  "ingested",
  "parsing",
  "extracting",
  "needs_human_parse",
  "generating",
  "failed",
  "extraction_failed",
]);

/**
 * Business mode reads the score as a qualitative band; engineering mode keeps the raw
 * percentage. The thresholds are identical — only the rendering differs.
 */
export function ConfidenceBadge({ value }: { value: number }) {
  const { t, isBusiness } = useVocab();
  const v: "success" | "warning" | "destructive" =
    value >= 0.85 ? "success" : value >= 0.65 ? "warning" : "destructive";
  const band = t(
    value >= 0.85
      ? "obligation.confidence.high"
      : value >= 0.65
        ? "obligation.confidence.medium"
        : "obligation.confidence.low",
  );
  return (
    <Badge variant={v} title={t("obligation.confidence.tip")}>
      {isBusiness ? band : `${(value * 100).toFixed(0)}%`}
    </Badge>
  );
}

export function AreaBadge({ area }: { area: string }) {
  return <Badge variant="outline">{titleCase(area)}</Badge>;
}

import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";

export function MethodBadge({ method }: { method: string }) {
  return method === "deterministic" ? (
    <Badge variant="secondary" title="Extracted by the deterministic regex rule engine — no LLM call">
      ⚙ regex
    </Badge>
  ) : (
    <Badge variant="outline" title="Extracted by the language model (qualitative/ambiguous section)">
      ✦ llm
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
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
  };
  return <Badge variant={map[status] ?? "muted"}>{titleCase(status)}</Badge>;
}

export function ConfidenceBadge({ value }: { value: number }) {
  const v: "success" | "warning" | "destructive" =
    value >= 0.85 ? "success" : value >= 0.65 ? "warning" : "destructive";
  return <Badge variant={v}>{(value * 100).toFixed(0)}%</Badge>;
}

export function AreaBadge({ area }: { area: string }) {
  return <Badge variant="outline">{titleCase(area)}</Badge>;
}

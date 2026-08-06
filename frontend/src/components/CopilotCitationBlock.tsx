import { AlertTriangle, Database } from "lucide-react";
import { useVocab } from "@/hooks/useVocab";
import type { CopilotCitation, CopilotResponseType } from "@/lib/types";

export function CopilotCitationBlock({
  citations,
  grounded,
  confidence,
  responseType,
}: {
  citations?: CopilotCitation[];
  grounded?: boolean;
  confidence?: number;
  responseType?: CopilotResponseType;
}) {
  const { t, isBusiness } = useVocab();
  if (responseType === "greeting") return null;
  if (responseType === "workspace_summary") {
    return (
      <div className="mt-2 flex items-start gap-1.5 border-t pt-2 text-[11px] text-muted-foreground">
        <Database className="mt-0.5 h-3 w-3 shrink-0" />
        <span>Calculated from current workspace records.</span>
      </div>
    );
  }
  if (!citations?.length) {
    return (
      <div className="mt-2 flex items-start gap-1.5 border-t pt-2 text-[11px] text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
        <span>Not tied to a specific obligation. Treat this as general guidance.</span>
      </div>
    );
  }
  const basis = isBusiness
    ? `Based on ${citations.length} source${citations.length > 1 ? "s" : ""}`
    : `${grounded ? "Grounded in" : "Partially grounded in"} ${citations.length} source${citations.length > 1 ? "s" : ""}`;
  return (
    <div className="mt-2 space-y-1.5 border-t pt-2">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{basis}</span>
        {confidence !== undefined && (
          <span className="tabular">
            {isBusiness ? t("obligation.confidence").toLowerCase() : "confidence"} {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
      {citations.map((citation) => (
        <div key={citation.obligation_identifier} className="rounded border px-2 py-1.5 text-[11px]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-medium">{citation.obligation_identifier}</span>
            {citation.circular_reference && <span className="text-muted-foreground">{citation.circular_reference}</span>}
            {citation.paragraph && <span className="text-muted-foreground">Paragraph {citation.paragraph}</span>}
          </div>
          {citation.quote && <div className="mt-0.5 text-muted-foreground italic">{citation.quote}</div>}
        </div>
      ))}
    </div>
  );
}

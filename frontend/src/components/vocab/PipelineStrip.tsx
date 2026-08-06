/**
 * The one place "how a circular was processed" is rendered.
 *
 * Previously this existed three times (Command Center, Review, Analytics) with three
 * different implementations and only one of them mode-aware — which is how "Funnel:
 * sections / candidates / regex / LLM" survived on Review after the Command Center had
 * already been cleaned up. Three variants, one copy source.
 */
import { useVocab } from "@/hooks/useVocab";
import { automationRate, type PipelineStats } from "@/lib/vocab/pipeline";

/** Compact single-line strip — used above the Review queue. */
export function PipelineStrip({ stats }: { stats: PipelineStats }) {
  const { t } = useVocab();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      <span className="font-medium text-foreground">{t("review.summary")}</span>
      <span>{stats.sections} {t("pipeline.sections")}</span>
      <span>{stats.candidates} {t("pipeline.candidates")}</span>
      <span>{stats.automatic} {t("pipeline.automatic")}</span>
      <span>{stats.aiReviewed} {t("pipeline.ai_reviewed")}</span>
      <span className="tabular">{automationRate(stats)}% {t("pipeline.automation_rate").toLowerCase()}</span>
    </div>
  );
}

/** Three-up figure block with an automation-rate footer — Command Center and Analytics. */
export function PipelineSummary({ stats }: { stats: PipelineStats }) {
  const { t } = useVocab();
  return (
    <>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Figure value={stats.candidates} label={t("pipeline.candidate_sections")} />
        <Figure value={stats.automatic} label={t("pipeline.automatic")} />
        <Figure value={stats.aiReviewed} label={t("pipeline.ai_reviewed")} tone />
      </div>
      {stats.candidates > 0 && (
        <div className="mt-3 border-t pt-2 flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">{t("pipeline.automation_rate")}</span>
          <span className="text-sm font-semibold tabular">{automationRate(stats)}%</span>
        </div>
      )}
    </>
  );
}

function Figure({ value, label, tone }: { value: number; label: string; tone?: boolean }) {
  return (
    <div>
      <div className={`text-lg font-semibold tabular${tone ? " text-primary" : ""}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

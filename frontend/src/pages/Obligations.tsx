import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useVocab } from "@/hooks/useVocab";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pager } from "@/components/ui/pager";
import { PageSkeleton, QueryError } from "@/components/ui/data-state";
import { AreaBadge, ConfidenceBadge, MethodBadge, StatusBadge } from "@/components/badges";
import { titleCase } from "@/lib/utils";
import { OBLIGATION_STATUSES } from "@/lib/constants";
import { useAreas } from "@/hooks/useAreas";
import { AlertTriangle, ListChecks } from "lucide-react";

const PAGE_SIZE = 50;

export default function Obligations() {
  const navigate = useNavigate();
  const { t } = useVocab();
  const areas = useAreas();
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState("all");
  const [offset, setOffset] = useState(0);

  // Filters are sent to the backend, which already supports them - resetting offset
  // whenever they change avoids landing past the end of a smaller filtered result set.
  useEffect(() => setOffset(0), [area, status]);

  const obligationsQuery = useQuery({
    queryKey: ["obligations", area, status, offset],
    queryFn: () =>
      api.listObligations({
        functional_area: area === "all" ? undefined : area,
        status: status === "all" ? undefined : status,
        offset,
        limit: PAGE_SIZE,
      }),
  });
  const page = obligationsQuery.data;

  const rows = page?.items ?? [];
  const total = page?.total ?? 0;
  const flagged = rows.filter((o) => o.needs_review).length;

  if (obligationsQuery.isLoading) {
    return <PageSkeleton label="Loading obligations" cards={0} />;
  }

  if (obligationsQuery.isError && page === undefined) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Obligations</h1>
          <p className="text-sm text-muted-foreground">{t("obligations.subtitle")}</p>
        </div>
        <QueryError title="Obligations could not be loaded" onRetry={() => void obligationsQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Obligations</h1>
          <p className="text-sm text-muted-foreground">{t("obligations.subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:items-center">
          <select aria-label="Filter by department" value={area} onChange={(e) => setArea(e.target.value)} className="h-11 min-w-0 rounded-lg border bg-card px-2 sm:h-9 sm:px-3">
            {areas.map((a) => <option key={a} value={a}>{a === "all" ? "All departments" : titleCase(a)}</option>)}
          </select>
          <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 min-w-0 rounded-lg border bg-card px-2 sm:h-9 sm:px-3">
            {OBLIGATION_STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : titleCase(s)}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-3 text-sm">
        <Badge variant="muted" className="gap-1"><ListChecks className="h-3.5 w-3.5" /> {total} total</Badge>
        {flagged > 0 && <Badge variant="warning" className="gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {flagged} need review on this page</Badge>}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y md:hidden">
            {rows.map((o) => (
              <button key={o.id} onClick={() => navigate(`/obligations/${o.id}`)} className="block min-h-11 w-full p-4 text-left hover:bg-accent/40">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{o.identifier}</span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-2 text-sm leading-5">{o.description}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <AreaBadge area={o.functional_area} />
                  <MethodBadge method={o.extraction_method} />
                  <ConfidenceBadge value={o.confidence} />
                </div>
              </button>
            ))}
            {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No obligations match these filters.</div>}
          </div>
          <table className="hidden w-full text-sm md:table">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-3 px-4 font-medium">ID</th>
                <th className="py-3 px-4 font-medium">Obligation</th>
                <th className="py-3 px-4 font-medium">Department</th>
                <th className="py-3 px-4 font-medium">{t("obligation.method")}</th>
                <th className="py-3 px-4 font-medium">{t("obligation.confidence")}</th>
                <th className="py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-accent/40 cursor-pointer" onClick={() => navigate(`/obligations/${o.id}`)}>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">{o.identifier}</td>
                  <td className="py-3 px-4 max-w-md"><div className="truncate">{o.description}</div></td>
                  <td className="py-3 px-4"><AreaBadge area={o.functional_area} /></td>
                  <td className="py-3 px-4"><MethodBadge method={o.extraction_method} /></td>
                  <td className="py-3 px-4"><ConfidenceBadge value={o.confidence} /></td>
                  <td className="py-3 px-4"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">No obligations match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Pager offset={offset} limit={PAGE_SIZE} total={total} onOffsetChange={setOffset} />
    </div>
  );
}

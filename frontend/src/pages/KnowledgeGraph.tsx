import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY,
  type SimulationNodeDatum,
} from "d3-force";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, titleCase } from "@/lib/utils";
import type { GraphEdge, GraphNode } from "@/lib/types";
import { useVocab } from "@/hooks/useVocab";
import { X, ArrowRight } from "lucide-react";

const COLORS: Record<string, string> = {
  regulation: "#111111", obligation: "#333333", department: "#4d4d4d",
  rule: "#666666", task: "#808080", owner: "#999999", evidence: "#b3b3b3",
  risk: "#c2410c",
};
const RADIUS: Record<string, number> = { regulation: 13, department: 10, owner: 9, risk: 9 };
const RISK_COLORS: Record<string, string> = {
  minimal: "#16a34a", low: "#65a30d", medium: "#d97706",
  high: "#dc2626", critical: "#7f1d1d",
};
const HIDDEN_KEYS = new Set(["id", "type", "label", "x", "y", "vx", "vy", "index", "fx", "fy"]);

/** Node properties a non-technical user can act on, and how to name them. */
const PROPERTY_LABELS: Record<string, string> = {
  confidence: "Assurance",
  status: "Status",
  functional_area: "Department",
  level: "Risk level",
  identifier: "Reference",
  deadline: "Due",
  owner: "Owner",
};
type SimNode = GraphNode & SimulationNodeDatum;
const W = 820, H = 620;

// Simple view (business mode default): the operational path a compliance officer
// actually walks — Regulation → Obligation → Department → Task → Evidence → Rule.
// Same graph data and the same D3 simulation, just fewer node types (owners and risk
// signals stay in the advanced view) so the map reads clearly on first load.
const SIMPLE_TYPES = new Set(["regulation", "obligation", "department", "task", "evidence", "rule"]);

function layout(nodes: GraphNode[], edges: GraphEdge[], spacious = false) {
  const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
  const byId = new Map(simNodes.map((n) => [n.id, n]));
  const links = edges.filter((e) => byId.has(e.source) && byId.has(e.target)).map((e) => ({ ...e }));
  forceSimulation(simNodes)
    .force("link", forceLink(links as any).id((d: any) => d.id).distance(spacious ? 95 : 58).strength(0.35))
    .force("charge", forceManyBody().strength(spacious ? -340 : -190))
    .force("center", forceCenter(W / 2, H / 2))
    .force("x", forceX(W / 2).strength(0.05))
    .force("y", forceY(H / 2).strength(0.05))
    .force("collide", forceCollide(spacious ? 34 : 22))
    .stop()
    .tick(340);
  return byId as Map<string, SimNode>;
}

export default function KnowledgeGraphPage() {
  const navigate = useNavigate();
  const { data: raw, isLoading } = useQuery({ queryKey: ["kg"], queryFn: () => api.knowledgeGraph() });
  const vocab = useVocab();
  const { isBusiness } = vocab;
  const [selected, setSelected] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // Business mode opens on the simple path view; engineering mode opens on the full
  // graph. Either way the user can flip it here without changing the global mode.
  const [simple, setSimple] = useState(isBusiness);

  // Simple view is a filter over the same payload — no second graph component.
  const data = useMemo(() => {
    if (!raw) return raw;
    if (!simple) return raw;
    const nodes = raw.nodes.filter((n) => SIMPLE_TYPES.has(n.type));
    const keep = new Set(nodes.map((n) => n.id));
    const edges = raw.edges.filter((e) => keep.has(e.source) && keep.has(e.target));
    const nodes_by_type: Record<string, number> = {};
    for (const n of nodes) nodes_by_type[n.type] = (nodes_by_type[n.type] ?? 0) + 1;
    return { ...raw, nodes, edges, stats: { ...raw.stats, node_count: nodes.length, edge_count: edges.length, nodes_by_type } };
  }, [raw, simple]);

  const positioned = useMemo(() => (data ? layout(data.nodes, data.edges, simple) : null), [data, simple]);

  const adjacency = useMemo(() => {
    const m = new Map<string, { edge: GraphEdge; other: string; dir: "out" | "in" }[]>();
    for (const e of data?.edges ?? []) {
      (m.get(e.source) ?? m.set(e.source, []).get(e.source)!).push({ edge: e, other: e.target, dir: "out" });
      (m.get(e.target) ?? m.set(e.target, []).get(e.target)!).push({ edge: e, other: e.source, dir: "in" });
    }
    return m;
  }, [data]);

  const neighborIds = useMemo(() => {
    if (!selected) return null;
    return new Set((adjacency.get(selected) ?? []).map((a) => a.other));
  }, [selected, adjacency]);

  const toggleType = (t: string) =>
    setHidden((h) => { const n = new Set(h); n.has(t) ? n.delete(t) : n.add(t); return n; });

  const visible = (id: string) => positioned && !hidden.has(positioned.get(id)!.type);
  const selNode = selected && positioned ? positioned.get(selected) : null;
  const fill = (n: SimNode) => n.type === "risk" && n.level ? RISK_COLORS[n.level as string] ?? COLORS.risk : COLORS[n.type] ?? "#808080";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{vocab.t("kg.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {vocab.t(simple ? "kg.subtitle.simple" : "kg.subtitle.full")}
          </p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => { setSelected(null); setSimple((s) => !s); }}>
          {simple ? "Advanced view" : "Simple view"}
        </Button>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label={vocab.t("kg.count_items")} value={data.stats.node_count} />
          <Stat label={vocab.t("kg.count_links")} value={data.stats.edge_count} />
          <Stat label={vocab.t("kg.count_types")} value={Object.keys(data.stats.nodes_by_type).length} />
          <Stat label="Cross-doc supersessions" value={data.stats.cross_document_modifies} />
        </div>
      )}

      {/* type filters */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(COLORS).filter(([t]) => !simple || SIMPLE_TYPES.has(t)).map(([t, c]) => (
          <button
            key={t}
            onClick={() => toggleType(t)}
            className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-opacity",
              hidden.has(t) ? "opacity-40" : "")}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
            {vocab.e("kg.node", t)}
            {data?.stats.nodes_by_type[t] ? <span className="text-muted-foreground">{data.stats.nodes_by_type[t]}</span> : null}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-sm text-muted-foreground">Loading…</div>
            ) : !data?.nodes.length ? (
              <div className="p-8 text-sm text-muted-foreground">{vocab.t("kg.empty")}</div>
            ) : positioned ? (
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[620px]" onClick={() => setSelected(null)}>
                {data.edges.map((e, i) => {
                  if (!visible(e.source) || !visible(e.target)) return null;
                  const s = positioned.get(e.source)!, t = positioned.get(e.target)!;
                  const modifies = e.type === "MODIFIES";
                  const touches = selected && (e.source === selected || e.target === selected);
                  const dim = selected && !touches;
                  return (
                    <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                      stroke={modifies ? "#111111" : touches ? "#111111" : "#b3b3b3"}
                      strokeWidth={touches || modifies ? 1.8 : 1}
                      strokeDasharray={modifies ? "4 3" : undefined}
                      opacity={dim ? 0.12 : modifies ? 0.9 : 0.5} />
                  );
                })}
                {[...positioned.values()].map((n) => {
                  if (hidden.has(n.type)) return null;
                  const isSel = n.id === selected;
                  const isNbr = neighborIds?.has(n.id);
                  const dim = selected && !isSel && !isNbr;
                  const r = (RADIUS[n.type] ?? 7) + (isSel ? 4 : 0);
                  return (
                    <g key={n.id} transform={`translate(${n.x},${n.y})`} opacity={dim ? 0.2 : 1}
                      className="cursor-pointer" onClick={(ev) => { ev.stopPropagation(); setSelected(n.id); }}>
                      {isSel && <circle r={r + 5} fill="none" stroke={fill(n)} strokeWidth={1.5} opacity={0.5} />}
                      <circle r={r} fill={fill(n)} stroke="hsl(var(--card))" strokeWidth={2} />
                      {(isSel || isNbr || n.type === "regulation" || n.type === "department" || n.type === "owner" || n.type === "risk") && (
                        <text x={0} y={r + 11} textAnchor="middle" className="fill-foreground pointer-events-none" style={{ fontSize: 9 }}>
                          {n.label.length > 20 ? n.label.slice(0, 20) + "…" : n.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            ) : null}
          </CardContent>
        </Card>

        {/* Inspector */}
        <Card>
          <CardContent className="pt-5">
            {!selNode ? (
              <div className="text-sm text-muted-foreground">
                <div className="font-medium text-foreground mb-1">Inspector</div>
                {vocab.t("kg.inspector_empty")}
              </div>
            ) : (
              <NodeInspector
                node={selNode}
                connections={adjacency.get(selNode.id) ?? []}
                labelOf={(id) => positioned!.get(id)?.label ?? id}
                typeOf={(id) => positioned!.get(id)?.type ?? ""}
                onSelect={setSelected}
                onClose={() => setSelected(null)}
                onOpenDoc={(id) => navigate(`/documents/${id}/review`)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NodeInspector({ node, connections, labelOf, typeOf, onSelect, onClose, onOpenDoc }: {
  node: SimNode;
  connections: { edge: GraphEdge; other: string; dir: "out" | "in" }[];
  labelOf: (id: string) => string;
  typeOf: (id: string) => string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onOpenDoc: (docId: string) => void;
}) {
  const vocab = useVocab();
  const props = Object.entries(node).filter(
    ([k, v]) =>
      !HIDDEN_KEYS.has(k) &&
      (typeof v === "string" || typeof v === "number" || typeof v === "boolean") &&
      // Node properties are raw backend field names and an open set. Rather than ship a
      // partial dictionary that leaks the tail, business mode shows only the fields that
      // mean something to a compliance officer; engineering mode shows everything.
      (!vocab.isBusiness || k in PROPERTY_LABELS),
  );
  return (
    <div className="animate-in">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Badge variant="outline" className="mb-1.5" style={{ color: COLORS[node.type] }}>{vocab.e("kg.node", node.type)}</Badge>
          <div className="text-sm font-medium">{node.label}</div>
        </div>
        <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
      </div>

      {node.type === "regulation" && (
        <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => onOpenDoc(node.id.replace(/^reg:/, ""))}>
          Open document <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}

      {props.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {props.map(([k, v]) => (
            <div key={k} className="text-xs">
              <span className="text-muted-foreground">{PROPERTY_LABELS[k] ?? titleCase(k)}: </span>
              <span className="break-words">{k === "confidence" ? `${(Number(v) * 100).toFixed(0)}%` : String(v)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Relationships ({connections.length})
        </div>
        <div className="space-y-1 max-h-[280px] overflow-y-auto">
          {connections.map((c, i) => (
            <button key={i} onClick={() => onSelect(c.other)}
              className="w-full text-left rounded-md border px-2 py-1.5 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>{c.dir === "out" ? "→" : "←"}</span>
                <span title={c.edge.type}>{vocab.e("kg.edge", c.edge.type)}</span>
                <span className="ml-auto" style={{ color: COLORS[typeOf(c.other)] }}>{vocab.e("kg.node", typeOf(c.other))}</span>
              </div>
              <div className="text-xs truncate">{labelOf(c.other)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular">{value}</div>
      </CardContent>
    </Card>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUp,
  Calendar,
  Check,
  FileText,
  Folder,
  Paperclip,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView, usePrefersReducedMotion } from "./primitives";
import { CONNECTOR_MARKS } from "./brand-icons";

/* ---------------------------------------------------------------------------
   Animated product cards, built to the Corekit reference's construction:
   a #f5f5f5 24px-radius panel holding a floating white 16px-radius card with
   `0 0 0 1px rgb(0 0 0/.04), 0 2px 20px rgb(0 0 0/.04)`.

   The UI depicted is PRAXIS's real workspace — obligations, the review gate,
   tasks, evidence, the compliance map. Numbers come from the shipped demo
   circular (94-page SEBI Master Circular for Investment Advisers, 151 sections).
--------------------------------------------------------------------------- */

/** The grey panel every card mockup floats inside. */
export function Panel({
  children,
  className,
  height = 373,
}: {
  children: ReactNode;
  className?: string;
  height?: number;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[var(--r-panel)] bg-[var(--panel)] p-6",
        className,
      )}
      style={{ minHeight: height }}
    >
      {children}
    </div>
  );
}

/** The floating white card inside a panel. */
export function Float({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "w-full rounded-[var(--r-float)] bg-white p-4 shadow-[var(--shadow-float)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Cycles an index on an interval once the card is on screen. */
function useCycle(length: number, ms = 2200) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });
  const reduced = usePrefersReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!inView || reduced) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % length), ms);
    return () => window.clearInterval(id);
  }, [inView, reduced, length, ms]);
  return { ref, i, inView };
}

/* --- A · obligation picker (mirrors the reference's model picker) ---------- */

const PICKS = [
  "Maintain client risk profiling records",
  "Disclose conflicts of interest in writing",
  "File half-yearly compliance certificate",
];

export function ObligationPickerCard() {
  const { ref, i } = useCycle(PICKS.length, 2000);
  return (
    <Panel>
      <div ref={ref} className="w-full max-w-[300px]">
        <Float className="p-0">
          <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
            <Search className="h-3.5 w-3.5 text-[var(--ink-3)]" />
            <span className="text-[13px] text-[var(--ink-3)]">Search obligations</span>
          </div>
          <div className="p-2">
            {PICKS.map((p, n) => (
              <div
                key={p}
                className={cn(
                  "row-pick flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] leading-snug",
                  n === i ? "bg-[var(--panel)] text-[var(--ink-strong)]" : "text-[var(--ink-2)]",
                )}
              >
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[5px] bg-[var(--panel)] text-[9px] text-[var(--ink-3)]">
                  §
                </span>
                <span className="flex-1 truncate">{p}</span>
                {n === i ? <Check className="h-3.5 w-3.5 shrink-0 text-[var(--ink-strong)]" /> : null}
              </div>
            ))}
          </div>
        </Float>
      </div>
    </Panel>
  );
}

/* --- B · review gate (mirrors the "Summarize objections" card) ------------- */

export function ReviewGateCard() {
  return (
    <Panel>
      <div className="flex w-full max-w-[300px] flex-col items-center gap-6">
        <Float>
          <p className="text-[15px] leading-snug text-[var(--ink-strong)]">
            <span className="font-semibold">Approve</span> the obligations found in § 6.1.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-2">
              {["A", "S", "P"].map((c) => (
                <span
                  key={c}
                  className="grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[var(--panel)] text-[9px] font-medium text-[var(--ink-2)]"
                >
                  {c}
                </span>
              ))}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4f9] px-2.5 py-1 text-[12px] font-medium text-[var(--accent-blue)]">
              <ShieldCheck className="h-3 w-3" />
              Review gate
            </span>
          </div>
        </Float>
        <p className="shimmer inline-flex items-center gap-2 text-[14px] font-medium">
          <span className="dot-pulse inline-flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
          </span>
          Awaiting officer sign-off…
        </p>
      </div>
    </Panel>
  );
}

/* --- C · task owner (mirrors the "Support Agent" card) --------------------- */

export function TaskOwnerCard() {
  return (
    <Panel>
      <div className="w-full max-w-[300px]">
        <Float>
          <div className="flex items-start gap-3">
            <span className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-[#e8e2f4] via-[#dfeaf5] to-[#e6f2e7]" />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold leading-tight text-[var(--ink-strong)]">A. Rao</div>
              <div className="text-[13px] text-[var(--ink-2)]">Compliance Officer</div>
            </div>
            <Settings2 className="h-4 w-4 shrink-0 text-[var(--ink-3)]" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent-amber)]">
              <Calendar className="h-3.5 w-3.5" />
              Due 31 Mar
            </span>
            <div className="flex gap-1.5">
              {CONNECTOR_MARKS.slice(0, 3).map(({ name, Mark }) => (
                <span
                  key={name}
                  title={name}
                  className="grid h-7 w-7 place-items-center rounded-lg bg-white shadow-[var(--shadow-soft)]"
                >
                  <Mark className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>
        </Float>
      </div>
    </Panel>
  );
}

/* --- D · circular intake (mirrors the prompt composer) --------------------- */

export function IntakeCard() {
  return (
    <Panel height={420} className="p-8">
      <div className="w-full max-w-[460px] rounded-[20px] border border-dashed border-[var(--ink-4)] p-4">
        <Float>
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-gradient-to-br from-[#eef2f7] to-[#e3ebf3]">
              <FileText className="h-5 w-5 text-[var(--ink-2)]" />
            </span>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ink-2)]">
              <Folder className="h-3.5 w-3.5" />
              Regulations
            </span>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-body)]">
            Master Circular for Investment Advisers — 94 pages, 151 sections. Read it and list every obligation
            with its clause.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Paperclip className="h-4 w-4 text-[var(--ink-3)]" />
            <SlidersHorizontal className="h-4 w-4 text-[var(--ink-3)]" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4f9] px-2.5 py-1 text-[12px] font-medium text-[var(--accent-blue)]">
              <FileText className="h-3 w-3" />
              Circular
            </span>
            <span className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-[var(--ink-strong)]">
              <ArrowUp className="h-4 w-4 text-white" />
            </span>
          </div>
        </Float>
      </div>
    </Panel>
  );
}

/* --- E · analytics (mirrors the reference's stats + area chart) ------------ */

const SPARK = [42, 55, 38, 61, 49, 72, 58, 80, 66, 88, 74, 92];

export function AnalyticsCard() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });
  const w = 300;
  const h = 120;
  const max = Math.max(...SPARK);
  const pts = SPARK.map((v, n) => [(n / (SPARK.length - 1)) * w, h - (v / max) * h]);
  const line = pts.map((p, n) => `${n === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const fill = `${line} L${w},${h} L0,${h} Z`;

  return (
    <Panel height={420} className="p-8">
      <div ref={ref} className={cn("w-full max-w-[380px]", inView && "in-view")}>
        <Float className="p-5">
          <div className="flex justify-between">
            {[
              ["275", "Obligations"],
              ["18", "Analysis passes"],
              ["86%", "Automated"],
            ].map(([v, k], n) => (
              <div key={k} className={cn("text-center", n === 0 && "text-left")}>
                <div
                  className={cn(
                    "text-[20px] font-semibold leading-tight tracking-tight",
                    n === 0 ? "text-[var(--accent-green)]" : "text-[var(--ink-strong)]",
                  )}
                >
                  {v}
                </div>
                <div className="mt-0.5 text-[12px] text-[var(--ink-2)]">{k}</div>
              </div>
            ))}
          </div>

          <div className="relative mt-5">
            {[0, 1, 2, 3].map((n) => (
              <div
                key={n}
                className="absolute inset-x-0 border-t border-dashed border-[#e6e6e6]"
                style={{ top: `${n * 33.33}%` }}
              />
            ))}
            <svg viewBox={`0 0 ${w} ${h}`} className="relative w-full" style={{ height: h }}>
              <defs>
                <linearGradient id="praxis-spark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-green)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--accent-green)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={fill} fill="url(#praxis-spark)" className="spark-fill" />
              <path
                d={line}
                fill="none"
                stroke="var(--accent-green)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="spark-line"
              />
            </svg>
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-[var(--ink-3)]">
            <span>Apr</span>
            <span>Jul</span>
            <span>Oct</span>
            <span>Jan</span>
          </div>
        </Float>
      </div>
    </Panel>
  );
}

/* --- F · copilot chat (mirrors the reference's chat bento) ----------------- */

export function CopilotChatCard() {
  return (
    <div className="flex h-full flex-col justify-between gap-6 rounded-[var(--r-panel)] bg-white p-6 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3">
        <div className="seq flex justify-end" style={{ ["--seq-delay" as string]: "0ms" }}>
          <p className="max-w-[80%] rounded-2xl bg-white px-4 py-3 text-[14px] leading-snug text-[var(--ink-strong)] shadow-[var(--shadow-soft)]">
            Which obligations fall on the compliance officer this quarter?
          </p>
        </div>
        <div className="seq flex justify-start" style={{ ["--seq-delay" as string]: "500ms" }}>
          <p className="max-w-[85%] rounded-2xl bg-[var(--panel)] px-4 py-3 text-[14px] leading-snug text-[var(--ink-body)]">
            Nine. Four are filing deadlines — the half-yearly certificate is the nearest, due 31 Mar.
            <span className="mt-2 block text-[12px] text-[var(--ink-3)]">Source · § 4.2(b), § 6.1</span>
          </p>
        </div>
      </div>

      <div className="glow-ring rounded-[14px]">
        <div className="flex items-center gap-3 rounded-[14px] bg-white px-4 py-3">
          <span className="flex-1 text-[14px] text-[var(--ink-3)]">Ask about any obligation…</span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--panel)]">
            <ArrowUp className="h-4 w-4 text-[var(--ink-2)]" />
          </span>
        </div>
      </div>
    </div>
  );
}

/* --- G · processing window (mirrors the terminal bento) -------------------- */

const WINDOW_LINES = [
  ["Reading circular", "151 sections"],
  ["Setting recitals aside", "69 sections"],
  ["Identifying obligations", "275 found"],
  ["Routing for review", "63 pending"],
];

export function ProcessingWindowCard() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });
  return (
    <div
      ref={ref}
      className="flex h-full flex-col gap-5 rounded-[var(--r-panel)] bg-white p-6 shadow-[var(--shadow-soft)]"
    >
      <div className="flex items-center">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#f0645c]" />
          <span className="h-3 w-3 rounded-full bg-[#f2bd4c]" />
          <span className="h-3 w-3 rounded-full bg-[#61c554]" />
        </div>
        <span className="mono mx-auto text-[13px] font-medium text-[var(--ink-strong)]">praxis-run</span>
        <span className="w-[42px]" />
      </div>

      <div className="rounded-[10px] bg-[var(--panel)] px-4 py-3">
        <span className="mono text-[13px] text-[var(--ink-body)]">
          <span className="text-[var(--ink-3)]">&gt;</span> Master Circular 2025/94
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {WINDOW_LINES.map(([k, v], n) => (
          <div
            key={k}
            className={cn("flex items-center gap-2 text-[14px]", inView && "seq")}
            style={{ ["--seq-delay" as string]: `${n * 260}ms` }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-green)]" />
            <span className="flex-1 text-[var(--ink-body)]">{k}</span>
            <span className="mono text-[12px] text-[var(--ink-3)]">{v}</span>
          </div>
        ))}
        <div className="dot-pulse mt-1 flex items-center gap-2 text-[14px] text-[var(--ink-3)]">
          <span className="flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
          </span>
          Awaiting review
        </div>
      </div>
    </div>
  );
}

/* --- H · automation list (mirrors the "Workflow Automation" card) ---------- */

const AUTOMATIONS = [
  { t: "Email alerts", s: "Notify owners", Mark: CONNECTOR_MARKS[0].Mark },
  { t: "Deadline calendar", s: "Track filings", Mark: CONNECTOR_MARKS[1].Mark },
  { t: "Audit reports", s: "Export evidence", Mark: CONNECTOR_MARKS[8].Mark },
];

export function AutomationListCard() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });
  return (
    <div ref={ref} className="flex flex-col gap-2">
      {AUTOMATIONS.map(({ t, s: sub, Mark }, n) => (
        <div
          key={t}
          className="flex items-center gap-3 rounded-[12px] bg-white px-3 py-2.5 shadow-[var(--shadow-soft)]"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f5f6f8]">
            <Mark className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="t-row-t">{t}</div>
            <div className="t-body-sm">{sub}</div>
          </div>
          <span
            className={cn(
              "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent-green)] text-white",
              inView && "tick",
            )}
            style={{ ["--tick-delay" as string]: `${n * 220}ms` }}
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        </div>
      ))}
    </div>
  );
}

/* --- I · evidence card ----------------------------------------------------- */

export function EvidenceCard() {
  return (
    <div className="flex justify-center">
      <div className="w-[168px] rounded-[12px] bg-white p-3 shadow-[var(--shadow-float)]">
        <div className="rounded-[8px] bg-gradient-to-br from-[#f3f1ee] via-[#eef0f2] to-[#e9eef0] p-3">
          {[100, 82, 92, 64, 88, 48].map((w, n) => (
            <div
              key={n}
              className="mb-1.5 h-1.5 rounded-full bg-white/70 last:mb-0"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          <FileText className="h-3 w-3 text-[var(--ink-3)]" />
          <span className="text-[11px] text-[var(--ink-2)]">Audit package.pdf</span>
        </div>
      </div>
    </div>
  );
}

/* --- J · connector cloud (real brand marks, as on the reference) ---------- */

export function ConnectorCloudCard() {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {CONNECTOR_MARKS.slice(0, 6).map(({ name, Mark }, i) => (
        <span
          key={name}
          title={name}
          className="float grid h-14 w-14 place-items-center rounded-[14px] bg-white shadow-[var(--shadow-soft)]"
          style={{
            ["--float-dur" as string]: `${4.4 + (i % 3) * 0.6}s`,
            ["--float-delay" as string]: `${-(i % 4) * 0.7}s`,
          }}
        >
          <Mark className="h-6 w-6" />
        </span>
      ))}
    </div>
  );
}

/* --- K · integration field (dashed grid with real marks) ------------------ */

/* Tiles sit only in the outer margins (x < 22% or x > 74%), so none can ever
   collide with the centred heading, body or CTA — as on the reference. */
const TILE_POS = [
  { x: "2%", y: "10%", d: "0s" },
  { x: "12%", y: "33%", d: "-1.2s" },
  { x: "3%", y: "58%", d: "-0.6s" },
  { x: "13%", y: "81%", d: "-2.1s" },
  { x: "85%", y: "9%", d: "-1.7s" },
  { x: "79%", y: "33%", d: "-0.9s" },
  { x: "86%", y: "57%", d: "-2.4s" },
  { x: "78%", y: "80%", d: "-1.4s" },
];

export function IntegrationField({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full overflow-hidden py-24 lg:py-32">
      <div className="dash-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      {CONNECTOR_MARKS.slice(0, TILE_POS.length).map(({ name, Mark }, i) => (
        <span
          key={name}
          title={name}
          className="float pointer-events-none absolute hidden h-20 w-20 place-items-center rounded-[20px] bg-white shadow-[var(--shadow-float)] lg:grid"
          style={{
            left: TILE_POS[i].x,
            top: TILE_POS[i].y,
            ["--float-dur" as string]: "5.4s",
            ["--float-delay" as string]: TILE_POS[i].d,
          }}
        >
          <Mark className="h-9 w-9" />
        </span>
      ))}
      <div className="relative">{children}</div>
    </div>
  );
}

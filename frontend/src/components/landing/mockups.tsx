import { useEffect, useState, type ReactNode } from "react";
import { Check, FileText, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { usePrefersReducedMotion } from "./primitives";

/* ---------------------------------------------------------------------------
   UI mockups of the PRAXIS workspace, drawn in markup rather than screenshotted
   so they stay crisp at any size and can animate. Every number shown comes from
   the shipped demo corpus (94-page SEBI Master Circular for Investment Advisers,
   151 sections) and matches the README.
--------------------------------------------------------------------------- */

export function BrowserChrome({
  url = "praxis.local",
  children,
  className,
}: {
  url?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[var(--r-lg)] bg-white shadow-[var(--shadow-3)]", className)}>
      <div className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--surface-3)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--surface-3)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--surface-3)]" />
        </div>
        <div className="mono mx-auto rounded-md bg-white px-3 py-1 text-[10px] text-[var(--ink-3)] shadow-[var(--shadow-1)]">
          {url}
        </div>
        <div className="w-[42px]" />
      </div>
      {children}
    </div>
  );
}

const NAV = ["Command Center", "Regulations", "Obligations", "Review", "Tasks", "Evidence", "Compliance Map"];

/** The hero product shot: a compressed Command Center. */
export function WorkspaceMock() {
  return (
    <div className="flex min-h-[320px] text-[11px] sm:min-h-[420px]">
      <aside className="hidden w-[172px] shrink-0 border-r border-[var(--line)] bg-[var(--surface)] p-3 sm:block">
        <div className="flex items-center gap-2 px-2 pb-4">
          <Logo className="h-4 w-4 text-[var(--ink)]" />
          <span className="text-[12px] font-semibold lowercase tracking-tight">praxis</span>
        </div>
        {NAV.map((n, i) => (
          <div
            key={n}
            className={cn(
              "mb-0.5 truncate rounded-lg px-2 py-[7px] text-[11px]",
              i === 0 ? "bg-white font-medium text-[var(--ink)] shadow-[var(--shadow-1)]" : "text-[var(--ink-2)]",
            )}
          >
            {n}
          </div>
        ))}
      </aside>

      <div className="flex-1 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold tracking-tight">Command Center</div>
            <div className="text-[10px] text-[var(--ink-3)]">Investment Advisers · Master Circular 2025/94</div>
          </div>
          <div className="mono flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] text-[var(--ink-2)] shadow-[var(--shadow-1)]">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--ink)]" />
            IDLE
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {[
            { k: "Obligations", v: "275" },
            { k: "Pending review", v: "63" },
            { k: "Open tasks", v: "48" },
            { k: "Evidence items", v: "112" },
          ].map((s) => (
            <div key={s.k} className="rounded-xl bg-white p-2.5 shadow-[var(--shadow-1)]">
              <div className="text-[10px] text-[var(--ink-3)]">{s.k}</div>
              <div className="mt-1 text-[18px] font-semibold leading-none tracking-tight">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl bg-white shadow-[var(--shadow-1)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2">
            <span className="text-[11px] font-medium">Obligations awaiting review</span>
            <span className="mono text-[9px] text-[var(--ink-3)]">SEBI/HO/MIRSD/…/2025/94</span>
          </div>
          {[
            ["Maintain records of client risk profiling", "Annual", "0.94"],
            ["Disclose conflicts of interest in writing", "Event-based", "0.91"],
            ["Segregate advisory and distribution activity", "Continuous", "0.88"],
            ["File half-yearly compliance certificate", "Half-yearly", "0.96"],
            ["Preserve records for five years", "Continuous", "0.93"],
          ].map(([t, freq, conf], i) => (
            <div
              key={t}
              className={cn("flex items-center gap-3 px-3 py-[9px]", i < 4 && "border-b border-[var(--line)]")}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ink-4)]" />
              <span className="flex-1 truncate text-[11px] text-[var(--ink)]">{t}</span>
              <span className="mono hidden rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] text-[var(--ink-2)] sm:inline">
                {freq}
              </span>
              <span className="mono text-[9px] text-[var(--ink-3)]">{conf}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --- pipeline stage panels ------------------------------------------------ */

function Panel({ children, title, meta }: { children: ReactNode; title: string; meta: string }) {
  return (
    <div className="rounded-[var(--r-card)] bg-white p-4 shadow-[var(--shadow-2)]">
      <div className="flex items-center justify-between pb-3">
        <span className="text-[12px] font-medium">{title}</span>
        <span className="mono text-[10px] text-[var(--ink-3)]">{meta}</span>
      </div>
      {children}
    </div>
  );
}

function IngestPanel() {
  return (
    <Panel title="Circular processing" meta="typed or scanned">
      <div className="flex items-start gap-3 rounded-xl bg-[var(--surface)] p-3">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-2)]" />
        <div className="min-w-0">
          <div className="truncate text-[12px] font-medium">Master Circular for Investment Advisers</div>
          <div className="mono mt-0.5 text-[10px] text-[var(--ink-3)]">94 pages · 151 sections · 2025/94</div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {[
          ["Structure detection", "151 sections"],
          ["Cross-references resolved", "38 links"],
          ["Background recitals set aside", "69 sections"],
          ["Regulatory sections found", "57 sections"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-[11px]">
            <Check className="h-3 w-3 shrink-0 text-[var(--ink)]" />
            <span className="flex-1 text-[var(--ink-2)]">{k}</span>
            <span className="mono text-[10px] text-[var(--ink)]">{v}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ExtractPanel() {
  return (
    <Panel title="Obligations identified" meta="automatic + analytical review">
      <div className="rounded-xl bg-[var(--surface)] p-3">
        <div className="mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-3)]">How sections were handled</div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div className="h-full bg-[var(--ink)]" style={{ width: "70%" }} />
          <div className="h-full bg-[var(--ink-4)]" style={{ width: "30%" }} />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-[var(--ink-2)]">
          <span>40 automatic</span>
          <span>17 reviewed closely</span>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {[
          ["Obligations identified", "275"],
          ["Automatic", "88"],
          ["Analytical review", "187"],
          ["Analysis passes used", "18"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--ink-2)]">{k}</span>
            <span className="mono text-[10px] text-[var(--ink)]">{v}</span>
          </div>
        ))}
      </div>
      <div className="mono mt-3 rounded-lg bg-[var(--ink)] px-3 py-2 text-[10px] leading-relaxed text-white/90">
        “…shall maintain records of risk profiling of clients…” <span className="text-white/50">§ 4.2(b)</span>
      </div>
    </Panel>
  );
}

function ReviewPanel() {
  return (
    <Panel title="Human review gate" meta="before anything is generated">
      <div className="rounded-xl bg-[var(--surface)] p-3">
        <div className="text-[12px] font-medium leading-snug">
          Disclose all conflicts of interest to the client in writing
        </div>
        <div className="mono mt-1.5 text-[10px] text-[var(--ink-3)]">
          assurance 0.91 · source § 6.1 · verbatim clause attached
        </div>
        <div className="mt-3 flex gap-2">
          <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-[10px] font-medium text-white">Approve</span>
          <span className="rounded-full bg-white px-3 py-1 text-[10px] shadow-[var(--shadow-1)]">Edit</span>
          <span className="rounded-full bg-white px-3 py-1 text-[10px] shadow-[var(--shadow-1)]">Reject</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 shadow-[var(--shadow-1)]">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--ink-2)]" />
        <span className="text-[11px] leading-snug text-[var(--ink-2)]">
          Nothing is generated until a person signs off. The gate is structural, not a setting.
        </span>
      </div>
    </Panel>
  );
}

function GeneratePanel() {
  return (
    <Panel title="Rules · tasks · evidence" meta="approved obligations only">
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Rules", "5 types"],
          ["Tasks", "owners + SLAs"],
          ["Evidence", "templates"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-[var(--surface)] p-2.5 text-center">
            <div className="text-[11px] font-medium">{k}</div>
            <div className="mono mt-0.5 text-[9px] text-[var(--ink-3)]">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {[
          ["Half-yearly compliance certificate", "Compliance Officer", "31 Mar"],
          ["Client risk profile refresh", "Advisory Head", "30 Jun"],
          ["Conflict register update", "Compliance Officer", "15 Apr"],
        ].map(([t, owner, due], i) => (
          <div key={t} className={cn("flex items-center gap-2 pb-2 text-[11px]", i < 2 && "rule-b")}>
            <GitBranch className="h-3 w-3 shrink-0 text-[var(--ink-3)]" />
            <span className="flex-1 truncate text-[var(--ink)]">{t}</span>
            <span className="hidden text-[10px] text-[var(--ink-3)] sm:inline">{owner}</span>
            <span className="mono text-[10px] text-[var(--ink-2)]">{due}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--ink-3)]">
        <Sparkles className="h-3 w-3" />
        Audit package exports to PDF + XLSX with the source clause on every row.
      </div>
    </Panel>
  );
}

export const STAGE_PANELS = [IngestPanel, ExtractPanel, ReviewPanel, GeneratePanel];

/* --- responsive device switcher ------------------------------------------ */

const DEVICES = ["Desktop", "Tablet", "Mobile"] as const;

export function DeviceSwitcher() {
  const [device, setDevice] = useState<(typeof DEVICES)[number]>("Desktop");
  const width = device === "Desktop" ? "100%" : device === "Tablet" ? "62%" : "34%";

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto flex w-fit gap-1 rounded-full bg-white p-1 shadow-[var(--shadow-1)]">
        {DEVICES.map((d) => (
          <button
            key={d}
            onClick={() => setDevice(d)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-300",
              device === d ? "bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-1 items-end justify-center">
        <div
          className="overflow-hidden rounded-t-xl bg-white shadow-[var(--shadow-2)] transition-[width] duration-500 [transition-timing-function:var(--ease)]"
          style={{ width }}
        >
          <div className="flex items-center gap-1.5 border-b border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--surface-3)]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--surface-3)]" />
            <span className="mono ml-auto text-[8px] text-[var(--ink-3)]">praxis.local</span>
          </div>
          <div className="space-y-1.5 p-2.5">
            <div className="h-2 w-1/2 rounded bg-[var(--surface-3)]" />
            <div className="h-1.5 w-3/4 rounded bg-[var(--surface-2)]" />
            <div className={cn("grid gap-1.5 pt-1", device === "Mobile" ? "grid-cols-1" : "grid-cols-3")}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-md p-1.5 shadow-[var(--shadow-1)]">
                  <div className="h-1 w-2/3 rounded bg-[var(--surface-2)]" />
                  <div className="mt-1 h-2 w-1/2 rounded bg-[var(--surface-3)]" />
                </div>
              ))}
            </div>
            <div className="h-1.5 w-full rounded bg-[var(--surface-2)]" />
            <div className="h-1.5 w-5/6 rounded bg-[var(--surface-2)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- funnel telemetry ----------------------------------------------------- */

const FUNNEL: Record<string, { label: string; naive: number; actual: number; bars: number[] }> = {
  "151-section": { label: "94-page Master Circular", naive: 130, actual: 18, bars: [130, 96, 61, 34, 18] },
  "870-section": { label: "870-section circular", naive: 629, actual: 72, bars: [629, 470, 288, 151, 72] },
};

const CHART_H = 132;

export function FunnelTelemetry() {
  const [key, setKey] = useState("151-section");
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(reduced);
  const set = FUNNEL[key];
  const max = Math.max(...set.bars);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 120);
    return () => clearTimeout(t);
  }, []);

  const saved = Math.round((1 - set.actual / set.naive) * 100);

  return (
    <div className="mx-auto flex w-full max-w-[380px] flex-col rounded-[var(--r-card)] bg-white p-4 shadow-[var(--shadow-2)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--ink)]" />
          <span className="text-[13px] font-medium">Analysis passes per circular</span>
        </div>
        <div className="flex gap-1">
          {Object.keys(FUNNEL).map((k) => (
            <button
              key={k}
              onClick={() => setKey(k)}
              className={cn(
                "mono rounded-full px-2 py-[3px] text-[10px] transition-colors duration-300",
                key === k ? "bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]",
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Bar heights are px, not %, so they resolve without needing a definite-height ancestor. */}
      <div className="mt-5 flex items-end gap-2.5" style={{ minHeight: CHART_H + 18 }}>
        {set.bars.map((b, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            <span className="mono text-[9px] text-[var(--ink-3)]">{b}</span>
            <div
              className={cn(
                "bar w-full rounded-t-md",
                i === set.bars.length - 1 ? "bg-[var(--ink)]" : "bg-[var(--surface-2)]",
              )}
              style={{ height: mounted ? Math.max((b / max) * CHART_H, 6) : 0 }}
            />
          </div>
        ))}
      </div>

      <div className="rule-t mt-3 flex items-baseline justify-between pt-3">
        <span className="text-[12px] text-[var(--ink-2)]">{set.label}</span>
        <span className="mono text-[12px] text-[var(--ink)]">−{saved}% passes</span>
      </div>
    </div>
  );
}

/* --- local-inference card ------------------------------------------------- */

export function LocalInferenceMock() {
  return (
    <div className="mx-auto w-full max-w-[380px] rounded-[var(--r-card)] bg-white p-4 shadow-[var(--shadow-2)]">
      <div className="mono pb-3 text-[10px] uppercase tracking-[0.08em] text-[var(--ink-3)]">Where the work happens</div>
      {[
        ["Reading circulars", "your servers"],
        ["Analytical review", "your servers"],
        ["Search index", "your servers"],
        ["Sent to outside services", "nothing"],
      ].map(([k, v], i) => (
        <div key={k} className={cn("flex items-center justify-between py-2.5 text-[13px]", i < 3 && "rule-b")}>
          <span className="text-[var(--ink-2)]">{k}</span>
          <span className="mono text-[11px] text-[var(--ink)]">{v}</span>
        </div>
      ))}
    </div>
  );
}

/* --- connector grid ------------------------------------------------------- */

const CONNECTORS = [
  { name: "Email alerts", live: true },
  { name: "Deadline calendar", live: true },
  { name: "Single sign-on", live: true },
  { name: "Slack", live: false },
  { name: "Jira", live: false },
  { name: "Google Drive", live: false },
  { name: "DocuSign", live: false },
  { name: "SEBI SCORES", live: false },
];

export function ConnectorGrid() {
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {CONNECTORS.map((c, i) => (
        <div
          key={c.name}
          className="float flex flex-col justify-between rounded-xl bg-white p-3 shadow-[var(--shadow-1)]"
          style={{
            ["--float-dur" as string]: `${4.6 + (i % 3) * 0.5}s`,
            ["--float-delay" as string]: `${-(i % 4) * 0.8}s`,
          }}
        >
          <span className="text-[12px] leading-snug text-[var(--ink)]">{c.name}</span>
          <span
            className={cn(
              "mono mt-3 inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.07em]",
              c.live ? "text-[var(--ink)]" : "text-[var(--ink-3)]",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", c.live ? "bg-[var(--ink)]" : "bg-[var(--ink-4)]")} />
            {c.live ? "Connected" : "Not connected"}
          </span>
        </div>
      ))}
    </div>
  );
}

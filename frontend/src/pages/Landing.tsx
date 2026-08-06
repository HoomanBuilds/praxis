import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Database,
  FileSearch,
  History,
  LockKeyhole,
  Search,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

type ProductArea = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type Capability = ProductArea & {
  label: string;
  visual: "source" | "workflow" | "audit";
};

const capabilities: Capability[] = [
  {
    icon: FileSearch,
    label: "Source review",
    title: "Review each obligation beside the source",
    description: "Compare the extracted requirement with the original paragraph, applicability, deadline, and proposed owner.",
    visual: "source",
  },
  {
    icon: Workflow,
    label: "Approved work",
    title: "Create assigned work only after approval",
    description: "Approved obligations produce rules, tasks, deadlines, and evidence requirements for the responsible team.",
    visual: "workflow",
  },
  {
    icon: History,
    label: "Audit history",
    title: "Export the complete decision history",
    description: "Keep the source, reviewer, changes, evidence, and timestamps together in PDF and XLSX packages.",
    visual: "audit",
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Upload the circular",
    description: "Praxis stores the source document and separates it into reviewable paragraphs.",
  },
  {
    number: "02",
    title: "Review the obligations",
    description: "A compliance officer checks the wording, applicability, area, and proposed deadline.",
  },
  {
    number: "03",
    title: "Create the work",
    description: "Approved obligations produce rules, assigned tasks, and specific evidence requirements.",
  },
  {
    number: "04",
    title: "Attach proof and export",
    description: "Completed work and evidence remain linked to the source and its recorded decisions.",
  },
];

const deploymentDetails: ProductArea[] = [
  {
    icon: Database,
    title: "Your database",
    description: "Production records use PostgreSQL in your deployment, not a shared Praxis service.",
  },
  {
    icon: LockKeyhole,
    title: "Role checks in the API",
    description: "Permissions are enforced by the backend as well as the interface.",
  },
  {
    icon: History,
    title: "Append-only activity",
    description: "Edits create new audit entries with the actor, record, timestamp, and changed values.",
  },
  {
    icon: ShieldCheck,
    title: "Authenticated files",
    description: "Regulatory documents and evidence are served only through an authorized session.",
  },
];

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10%", threshold: 0.12 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={elementRef}
      className={`landing-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function CapabilityVisual({ type }: { type: Capability["visual"] }) {
  if (type === "source") {
    return (
      <div className="relative h-52 overflow-hidden rounded-2xl border border-stone-200 bg-[#F7F6F3]" aria-hidden="true">
        <div className="capability-source-back absolute -left-8 top-8 h-40 w-48 rounded-2xl border border-stone-200 bg-white shadow-sm" />
        <div className="capability-source-front absolute left-7 top-10 h-40 w-56 rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_16px_30px_rgba(28,25,23,0.08)] sm:left-9">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-stone-600">
            <FileSearch className="h-3.5 w-3.5" />
            Circular 2026
          </div>
          <div className="mt-5 space-y-2">
            <div className="h-1.5 w-4/5 rounded-full bg-stone-200" />
            <div className="h-1.5 w-2/3 rounded-full bg-stone-200" />
            <div className="h-6 rounded-lg border-l-2 border-amber-700 bg-amber-50" />
            <div className="h-1.5 w-3/5 rounded-full bg-stone-100" />
          </div>
        </div>
        <div className="capability-source-badge absolute bottom-4 right-4 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-900 shadow-sm">
          8 obligations found
        </div>
      </div>
    );
  }

  if (type === "workflow") {
    const stages = [
      ["Interpreted", "Source and applicability verified", true],
      ["Assigned", "Compliance owner notified", true],
      ["Review", "Officer decision pending", false],
    ] as const;

    return (
      <div className="relative h-52 overflow-hidden rounded-2xl border border-stone-200 bg-[#F7F6F3] p-5" aria-hidden="true">
        <div className="absolute bottom-5 left-[34px] top-5 w-px bg-stone-300" />
        <div className="space-y-3 pl-8">
          {stages.map(([title, description, complete]) => (
            <div key={title} className="capability-workflow-row relative flex min-h-[58px] items-center rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <span className={`absolute -left-[28px] h-3 w-3 rounded-full border-2 bg-[#F7F6F3] ${complete ? "border-stone-950" : "border-amber-700"}`} />
              <div>
                <p className="text-[11px] font-semibold text-stone-900">{title}</p>
                <p className="mt-0.5 text-[9px] text-stone-500">{description}</p>
              </div>
              {complete && <Check className="ml-auto h-3.5 w-3.5 text-emerald-700" />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-52 overflow-hidden rounded-2xl border border-stone-200 bg-[#F7F6F3] p-5" aria-hidden="true">
      <div className="capability-audit-panel rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold text-stone-900">Audit trail</span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-800">Complete</span>
        </div>
        <div className="mt-3 space-y-3">
          {["Source captured", "Decision approved", "Evidence retained"].map((item, index) => (
            <div key={item} className="capability-audit-row flex items-center gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-stone-950 text-white">
                <Check className="h-3 w-3" />
              </span>
              <span className="text-[10px] text-stone-600">{item}</span>
              <span className="ml-auto text-[9px] tabular text-stone-400">0{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-stone-200 bg-white px-3 py-2 text-[9px] font-medium text-stone-600 shadow-sm">
        <LockKeyhole className="h-3 w-3" />
        Append-only record
      </div>
    </div>
  );
}

function ReviewQueuePreview() {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-[0_24px_60px_rgba(28,25,23,0.07)] sm:p-6" role="img" aria-label="Praxis review queue example">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div>
          <p className="text-sm font-semibold text-stone-950">Review queue</p>
          <p className="mt-1 text-xs text-stone-500">Margin pledge circular</p>
        </div>
        <span className="text-xs tabular text-stone-400">3 obligations</span>
      </div>
      <div className="mt-2 divide-y divide-stone-200">
        {[
          ["Maintain client authorisation records", "Paragraph 3", "Approved"],
          ["Reconcile pledged securities daily", "Paragraph 4", "In review"],
          ["Publish client disclosure", "Paragraph 5", "Pending"],
        ].map(([title, source, status]) => (
          <div key={title} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-medium text-stone-800">{title}</p>
              <p className="mt-1 text-xs text-stone-400">{source}</p>
            </div>
            <span className="text-xs font-medium text-stone-500">{status}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-[#F5F5F4] px-4 py-3 text-xs leading-5 text-stone-500">
        Rules, tasks, and evidence are created only for the approved set.
      </div>
    </div>
  );
}

function CopilotPreview() {
  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_24px_60px_rgba(28,25,23,0.07)]" role="img" aria-label="Praxis Copilot response with source references">
      <div className="flex min-h-14 items-center border-b border-stone-200 px-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
          <Search className="h-4 w-4" /> Copilot
        </div>
        <span className="ml-auto text-xs text-stone-400">Workspace search</span>
      </div>
      <div className="p-5 sm:p-6">
        <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-stone-950 px-4 py-3 text-sm leading-6 text-white">
          Which obligations require review this week?
        </div>
        <div className="mt-5 rounded-2xl rounded-tl-md bg-[#F5F5F4] p-4 sm:p-5">
          <p className="text-xs font-semibold text-stone-900">3 obligations match</p>
          <p className="mt-3 text-xs leading-5 text-stone-600">
            The queue includes a disclosure control, an investor grievance control, and a record-retention obligation.
          </p>
          <div className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
            {["Master circular, paragraph 4.2", "Circular source, paragraph 7.1"].map((source, index) => (
              <div key={source} className="flex min-h-11 items-center gap-3 py-2.5">
                <span className="text-[10px] font-semibold tabular text-stone-400">0{index + 1}</span>
                <span className="text-xs font-medium text-stone-600">{source}</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-stone-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-[#FAFAF9] text-[#0C0A09]">
      <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-[#FAFAF9]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center px-5 sm:px-8">
          <Link to="/" className="flex min-h-11 items-center gap-2.5" aria-label="Praxis home">
            <Logo className="h-7 w-7" />
            <span className="text-lg font-semibold tracking-[-0.03em] lowercase">praxis</span>
          </Link>
          <nav className="mx-auto hidden items-center gap-7 lg:flex" aria-label="Landing navigation">
            <a href="#product" className="flex min-h-11 items-center px-1 text-sm text-stone-600 transition-colors hover:text-stone-950">Product</a>
            <a href="#workflow" className="flex min-h-11 items-center px-1 text-sm text-stone-600 transition-colors hover:text-stone-950">Workflow</a>
            <a href="#deployment" className="flex min-h-11 items-center px-1 text-sm text-stone-600 transition-colors hover:text-stone-950">Deployment</a>
          </nav>
          <div className="ml-auto flex items-center lg:ml-0">
            <Link to="/login" className="inline-flex min-h-11 items-center rounded-xl bg-stone-950 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800 sm:px-5">Open demo</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="px-5 pb-24 pt-20 sm:px-8 sm:pb-32 sm:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="landing-hero-title text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-[4.75rem]">
              Turn SEBI circulars into work your team can execute.
            </h1>
            <p className="landing-hero-copy mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-stone-600 sm:text-lg sm:leading-8">
              Praxis identifies obligations, keeps the source paragraph beside each one, and records the owner, deadline, evidence, and review decision.
            </p>
            <div className="landing-hero-action mt-9 flex justify-center">
              <Link to="/login" className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-6 text-sm font-medium text-white transition-colors hover:bg-stone-800 sm:w-auto">
                Open demo workspace
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
          <div className="landing-dashboard-frame mx-auto mt-16 max-w-[1320px] rounded-[2rem] border border-stone-200 bg-white p-2 shadow-[0_30px_90px_rgba(28,25,23,0.10)] sm:mt-20 sm:p-3">
            <img
              src="/praxis-command-center.png"
              alt="Live Praxis Command Center in the seeded demo workspace"
              width="1440"
              height="1050"
              fetchPriority="high"
              className="landing-dashboard-image block h-auto w-full rounded-[1.45rem]"
            />
          </div>
        </section>

        <section id="product" className="scroll-mt-24 border-y border-stone-200 bg-white px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-3xl text-center">
              <h2 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl">
                One record for every step after the circular arrives.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-600">
                Documents, decisions, assigned work, evidence, and exports stay connected instead of being copied between spreadsheets and inboxes.
              </p>
            </Reveal>
            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {capabilities.map((capability, index) => (
                <Reveal key={capability.title} delay={index * 70}>
                  <article className="landing-card rounded-[1.75rem] border border-stone-200 bg-white p-4 pb-7 sm:p-5 sm:pb-8">
                    <CapabilityVisual type={capability.visual} />
                    <div className="px-2 pt-7">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                        <capability.icon className="h-3.5 w-3.5" />
                        {capability.label}
                      </div>
                      <h3 className="mt-5 text-xl font-semibold leading-7 tracking-[-0.025em]">{capability.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-stone-600">{capability.description}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <Reveal>
              <h2 className="max-w-xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl">
                Nothing becomes a task until an officer approves it.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-stone-600">
                Extraction and operations are separate phases. Officers can revise, approve, or reject each obligation while the original paragraph remains visible.
              </p>
              <ul className="mt-8 space-y-4 text-sm leading-6 text-stone-700">
                {[
                  "Record the reviewer, decision, rationale, and time.",
                  "Generate work only for the approved obligations.",
                  "Keep rejected and revised items in the audit history.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-stone-300 bg-white"><Check className="h-2.5 w-2.5" /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={90}><ReviewQueuePreview /></Reveal>
          </div>
        </section>

        <section className="border-y border-stone-200 bg-[#F5F5F4] px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20">
            <Reveal><CopilotPreview /></Reveal>
            <Reveal delay={90} className="lg:order-last">
              <h2 className="max-w-xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl">
                Ask a question. Open the cited paragraph.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-stone-600">
                Copilot searches the obligations and workspace records the signed-in user can access. Every returned citation is checked against stored records before it is shown.
              </p>
              <ul className="mt-8 space-y-4 text-sm leading-6 text-stone-700">
                {[
                  "Search by owner, deadline, status, circular, or risk.",
                  "Open the stored obligation and its source text from the response.",
                  "Keep chat history in the browser for the next visit.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-stone-300 bg-white"><Check className="h-2.5 w-2.5" /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24 bg-white px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-3xl text-center">
              <h2 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl">One document, four recorded steps.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-600">
                The source, decision, assigned work, and evidence remain connected throughout the process.
              </p>
            </Reveal>
            <div className="mt-14 grid overflow-hidden rounded-3xl border border-stone-200 bg-stone-200 gap-px lg:grid-cols-4">
              {workflowSteps.map((step, index) => (
                <Reveal key={step.number} delay={index * 60}>
                  <article className="landing-card h-full bg-white p-6 sm:p-7">
                    <span className="text-xs font-semibold tabular text-stone-400">{step.number}</span>
                    <h3 className="mt-10 text-base font-semibold tracking-[-0.02em]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{step.description}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="deployment" className="scroll-mt-24 border-y border-stone-200 bg-[#F5F5F4] px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-3xl text-center">
              <h2 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl">Your records stay in the environment you deploy.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-600">
                Praxis runs as your application stack. Data access, files, permissions, and audit retention remain under your deployment configuration.
              </p>
            </Reveal>
            <div className="mt-14 grid overflow-hidden rounded-3xl border border-stone-200 bg-stone-200 gap-px sm:grid-cols-2 lg:grid-cols-4">
              {deploymentDetails.map((detail, index) => (
                <Reveal key={detail.title} delay={index * 60}>
                  <article className="landing-card h-full bg-white p-6">
                    <div className="grid h-10 w-10 place-items-center rounded-xl border border-stone-200 bg-[#FAFAF9]">
                      <detail.icon className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="mt-6 text-base font-semibold tracking-[-0.02em]">{detail.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{detail.description}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <div className="mx-auto max-w-6xl rounded-3xl border border-stone-200 bg-white px-6 py-14 text-center shadow-[0_20px_60px_rgba(28,25,23,0.06)] sm:px-10 sm:py-16">
              <h2 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl">
                See the complete workflow with the demo account.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-stone-600">
                Sign in to review the seeded circulars, inspect source-linked obligations, and test the working compliance flow.
              </p>
              <div className="mt-8 flex justify-center">
              <Link to="/login" className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-5 text-sm font-medium text-white transition-colors hover:bg-stone-800 sm:w-auto">
                Open demo workspace
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to="/" className="inline-flex min-h-11 items-center gap-2.5" aria-label="Praxis home">
              <Logo className="h-6 w-6" />
              <span className="font-semibold tracking-[-0.03em] lowercase">praxis</span>
            </Link>
            <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">Regulatory obligations, assigned work, evidence, and audit history in one system.</p>
          </div>
          <Link to="/login" className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 text-sm text-stone-500 transition-colors hover:text-stone-950">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}

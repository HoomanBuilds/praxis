import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Check,
  ChevronDown,
  CircleHelp,
  Gauge,
  Github,
  FileDown,
  Layers,
  Link2,
  Lock,
  Menu,
  Package,
  ScanText,
  ScrollText,
  Server,
  ShieldCheck,
  Upload,
  UserCheck,
  Users,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import {
  AccentEyebrow,
  Button,
  Marquee,
  Reveal,
  RisingWords,
  Section,
  TitleBlock,
  useInView,
  usePrefersReducedMotion,
} from "@/components/landing/primitives";
import { STAGE_PANELS, WorkspaceMock } from "@/components/landing/mockups";
import {
  AnalyticsCard,
  AutomationListCard,
  ConnectorCloudCard,
  CopilotChatCard,
  EvidenceCard,
  IntakeCard,
  IntegrationField,
  ObligationPickerCard,
  ProcessingWindowCard,
  ReviewGateCard,
  TaskOwnerCard,
} from "@/components/landing/cards";
import { ASCII_TEXTURE } from "@/components/landing/texture";
import "@/styles/landing.css";

/* ===========================================================================
   PRAXIS landing page.

   Structure mirrors the Pace reference node-for-node: a 1200px page on a
   #f7f7f7 canvas, every section padded 134/200/80 around a centred 820px
   column with 48px stack gaps and 16px title-block gaps.

   Every figure quoted is measured against the shipped demo circular (the real
   94-page SEBI Master Circular for Investment Advisers, 151 sections) and
   matches the README. The two sections that are NOT product truth — the
   deployment tiers and the customer quotes — are badged as sample layout
   content so nothing reads as a claim we cannot back.
=========================================================================== */

const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Engine", href: "#engine" },
  { label: "FAQ", href: "#faq" },
];

/* --- navigation: fixed, 62px, 820px content row with a dotted underline ---- */

function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 flex w-full justify-center bg-white/10 px-5 backdrop-blur-[8px] sm:px-[30px] lg:px-[200px]">
      <div className="w-full max-w-[820px]">
        <div className="rule-b flex h-[62px] items-center">
          <a href="#top" className="flex flex-1 items-center gap-1.5">
            <Logo className="h-[18px] w-[18px] text-[var(--ink)]" />
            <span className="text-[16px] font-semibold lowercase leading-[18px] tracking-[-0.4px]">praxis</span>
          </a>

          <div className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="t-nav transition-opacity duration-200 hover:opacity-60"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/docs"
              className="t-nav transition-opacity duration-200 hover:opacity-60"
            >
              Docs
            </Link>
          </div>

          <div className="flex flex-1 justify-end">
            <Link
              to="/login"
              className="hidden rounded-[var(--r-btn)] bg-[var(--btn-2)] px-3 py-2 text-[14px] font-medium leading-[14px] tracking-[-0.02em] text-[var(--ink)] transition-colors duration-300 hover:bg-[#e0e0e0] md:inline-flex"
            >
              Open demo workspace
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-[#f0f0f0] text-[var(--ink)] md:hidden"
            >
              {open ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {open ? (
          <div className="rule-b py-2 md:hidden">
            {[...NAV_LINKS, { label: "Docs", href: "/docs" }].map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-2 py-2.5 text-[15px] text-[var(--ink)] hover:bg-[var(--surface-2)]"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/login"
              className="mt-2 block rounded-[var(--r-btn)] bg-[var(--ink)] px-4 py-2.5 text-center text-[14px] font-medium text-white"
            >
              Open demo workspace
            </Link>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

/* --- hero ----------------------------------------------------------------- */

function Hero() {
  return (
    <div id="top" className="relative w-full">
      <div
        className="ascii-bg pointer-events-none absolute inset-x-0 top-0 h-[1148px]"
        style={{ backgroundImage: ASCII_TEXTURE }}
        aria-hidden="true"
      />

      <Section pad="hero" className="relative">
        {/* Title block — gap 20px in the reference's hero. */}
        <div className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-5 text-center">
          <h1 className="t-h1">
            <RisingWords text="Turn SEBI circulars into audit-ready compliance" startDelay={140} />
          </h1>

          <p
            className="fade-seq t-body mx-auto max-w-[520px]"
            style={{ ["--word-delay" as string]: "640ms" }}
          >
            PRAXIS reads regulatory circulars, extracts every obligation with its source clause, routes each one
            through human review, and generates audit-ready tasks, evidence and controls.
          </p>

          <div className="fade-seq mt-2" style={{ ["--word-delay" as string]: "760ms" }}>
            <Button to="/login">
              Open the demo workspace
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>

        {/* Hero image: 5px #f2f2f2 frame, 13px radius — the reference's treatment. */}
        <div
          className="fade-seq fade-bottom w-full rounded-[var(--r-frame)] bg-[var(--frame)] p-[5px]"
          style={{ ["--word-delay" as string]: "880ms" }}
        >
          <div className="overflow-hidden rounded-[9px] bg-[var(--card)]">
            <WorkspaceMock />
          </div>
        </div>
      </Section>
    </div>
  );
}

/* --- intermediary strip (the reference's "Logo Section") ------------------- */

const INTERMEDIARIES = [
  "Investment Advisers",
  "Research Analysts",
  "Portfolio Managers",
  "Merchant Bankers",
  "Alternative Investment Funds",
  "Mutual Funds",
  "Stock Brokers",
  "Depository Participants",
  "Custodians",
  "Debenture Trustees",
];

function IntermediaryStrip() {
  return (
    <Section pad="tight" className="overflow-hidden">
      <Reveal>
        <span className="t-eyebrow">Designed for regulated financial institutions</span>
      </Reveal>
      <Reveal delay={120} className="w-full">
        <Marquee duration={46}>
          {INTERMEDIARIES.map((s) => (
            <span
              key={s}
              className="whitespace-nowrap px-8 text-[24px] font-medium tracking-[-0.6px] text-[var(--ink-4)] transition-colors duration-300 hover:text-[var(--ink-2)]"
            >
              {s}
            </span>
          ))}
        </Marquee>
      </Reveal>
    </Section>
  );
}

/* --- why: what compliance costs today vs what PRAXIS does with it --------- */

const TODAY = [
  "Read the circular by hand",
  "Retype obligations into a spreadsheet",
  "Chase approvals over email",
  "Hunt for evidence at quarter-end",
  "Rebuild the audit trail from memory",
];

const WITH_PRAXIS: { icon: LucideIcon; label: string }[] = [
  { icon: Upload, label: "Upload the circular" },
  { icon: ScanText, label: "Obligations extracted with their clause" },
  { icon: UserCheck, label: "Compliance officer approves each one" },
  { icon: Workflow, label: "Tasks assigned with owners and dates" },
  { icon: Layers, label: "Evidence collected against each rule" },
  { icon: FileDown, label: "Audit package exported" },
];

function WhyPraxis() {
  return (
    <Section wide>
      <TitleBlock
        eyebrow="Why PRAXIS"
        title="The same work, without the manual chain"
        sub="Nothing here is hard reasoning. It is expensive because it is done by hand — and every step is one an auditor can ask you to reconstruct."
      />

      <div className="grid w-full gap-4 md:grid-cols-2">
        <Reveal className="h-full">
          <div className="flex h-full flex-col rounded-[var(--r-panel)] bg-[var(--panel)] p-7">
            <span className="t-title text-[var(--ink-2)]">Compliance today</span>
            <ol className="mt-6 flex flex-col gap-3.5">
              {TODAY.map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="mono mt-[3px] w-4 shrink-0 text-[12px] text-[var(--ink-4)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="t-body">{step}</span>
                </li>
              ))}
            </ol>
            <span className="t-body-sm mt-6 border-t border-[var(--line)] pt-4">
              Five hand-offs, none of them recorded.
            </span>
          </div>
        </Reveal>

        <Reveal delay={110} className="h-full">
          <div className="card-bordered flex h-full flex-col p-7">
            <span className="t-title">With PRAXIS</span>
            <ol className="mt-6 flex flex-col gap-3.5">
              {WITH_PRAXIS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-start gap-3">
                  <Icon className="mt-[3px] h-[17px] w-[17px] shrink-0 text-[var(--ink)]" strokeWidth={1.8} />
                  <span className="t-body !text-[var(--ink)]">{label}</span>
                </li>
              ))}
            </ol>
            <span className="t-body-sm mt-6 border-t border-[var(--line)] pt-4">
              One chain, recorded end to end.
            </span>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* --- how it works: framed mockup + 2×2 stage grid ------------------------- */

const STAGES: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: "Ingest",
    icon: ScanText,
    body: "Read the circular — typed or scanned — recover its section structure and resolve its cross-references, before any analysis begins.",
  },
  {
    title: "Extract",
    icon: Layers,
    body: "Set background recitals aside, compare the text against what you already hold, and reserve closer analytical review for the sections whose wording is open to interpretation.",
  },
  {
    title: "Review",
    icon: ShieldCheck,
    body: "Every obligation arrives awaiting review. A compliance officer approves, edits or rejects each one — nothing is generated without that sign-off.",
  },
  {
    title: "Generate controls",
    icon: Workflow,
    body: "Approved obligations become checkable rules, assigned tasks with owners and deadlines, and evidence templates — exportable as an audit package.",
  },
];

const STAGE_MS = 7000;

function HowItWorks() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });
  const reduced = usePrefersReducedMotion();
  const timer = useRef<number | undefined>(undefined);

  const select = useCallback((i: number) => {
    setActive(i);
    setPaused(true);
  }, []);

  useEffect(() => {
    if (!inView || paused || reduced) return;
    timer.current = window.setInterval(() => setActive((a) => (a + 1) % STAGES.length), STAGE_MS);
    return () => window.clearInterval(timer.current);
  }, [inView, paused, reduced]);

  const StagePanel = STAGE_PANELS[active];
  const autoplaying = inView && !paused && !reduced;

  return (
    <Section id="how-it-works">
      <TitleBlock
        title="Human review is built into every workflow"
        sub="The work is split in two so the human sign-off is structural rather than optional."
      />

      <div ref={ref} className="flex w-full flex-col gap-12">
        <Reveal className="w-full">
          <div className="w-full rounded-[var(--r-frame)] bg-[var(--frame)] p-[5px]">
            <div className="flex min-h-[420px] items-center justify-center rounded-[9px] bg-[var(--card)] p-6 sm:p-10">
              <div key={active} className="fade-seq w-full max-w-[480px]">
                <StagePanel />
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100} className="grid w-full gap-x-12 sm:grid-cols-2">
          {STAGES.map((s, i) => {
            const on = active === i;
            const Icon = s.icon;
            return (
              <button
                key={s.title}
                onClick={() => select(i)}
                aria-pressed={on}
                className={cn(
                  "rule-t relative grid grid-cols-[minmax(0,130px)_minmax(0,1fr)] gap-5 py-6 text-left",
                  "transition-opacity duration-500 [transition-timing-function:var(--ease)]",
                  on ? "opacity-100" : "opacity-45 hover:opacity-80",
                )}
              >
                <span className="t-h3 flex items-start gap-2">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2} />
                  {s.title}
                </span>
                <span className="t-body">{s.body}</span>

                <span className="absolute inset-x-0 top-0 h-px overflow-hidden">
                  {on ? (
                    <span
                      key={`${active}-${autoplaying}`}
                      className={cn("block h-full bg-[var(--ink)]", autoplaying ? "stage-progress" : "w-full")}
                      style={{ ["--stage-dur" as string]: `${STAGE_MS}ms` }}
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </Reveal>
      </div>
    </Section>
  );
}

/* --- workflow cards (Corekit's three-card row) ---------------------------- */

const WORKFLOW_CARDS: { card: ReactNode; title: string; body: string }[] = [
  {
    card: <ObligationPickerCard />,
    title: "Every obligation, traceable",
    body: "Each one carries the verbatim clause it came from, so an auditor can follow any control back to the circular.",
  },
  {
    card: <ReviewGateCard />,
    title: "Nothing ships unseen",
    body: "Obligations wait for a compliance officer to approve, edit or reject them. The gate is structural, not a setting.",
  },
  {
    card: <TaskOwnerCard />,
    title: "Owners and deadlines, assigned",
    body: "Approved obligations become tasks with a named owner, a due date, and the evidence expected at the end.",
  },
];

function WorkflowCards() {
  return (
    <Section wide>
      <Reveal className="w-full">
        <h2 className="t-h2 max-w-[1000px] text-left">
          Built around your obligations.{" "}
          <span className="text-[var(--ink-4)]">
            Flexible tools that adapt to the way your compliance team reviews, assigns, and evidences.
          </span>
        </h2>
      </Reveal>
      <div className="grid w-full gap-4 md:grid-cols-3">
        {WORKFLOW_CARDS.map((c, i) => (
          <Reveal key={c.title} delay={i * 100} className="h-full">
            <div className="flex h-full flex-col gap-5">
              {c.card}
              <div className="flex flex-col gap-2">
                <h3 className="t-label">{c.title}</h3>
                <p className="t-body">{c.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* --- alternating feature rows (Corekit's Feature 1 / Feature 2) ----------- */

function FeatureRow({
  tone,
  eyebrow,
  eyebrowIcon,
  title,
  body,
  bullets,
  cta,
  card,
  reversed = false,
}: {
  tone: "blue" | "green";
  eyebrow: string;
  eyebrowIcon: LucideIcon;
  title: string;
  body: string;
  bullets?: string[];
  cta?: string;
  card: ReactNode;
  reversed?: boolean;
}) {
  return (
    <Section wide>
      <div className="grid w-full items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal className={cn("flex flex-col items-start gap-5", reversed && "lg:order-2")}>
          <AccentEyebrow icon={eyebrowIcon} tone={tone}>
            {eyebrow}
          </AccentEyebrow>
          <h2 className="t-h2 max-w-[440px]">{title}</h2>
          <p className="t-body max-w-[460px]">{body}</p>

          {bullets ? (
            <ul className="flex flex-col gap-2.5">
              {bullets.map((b) => (
                <li key={b} className="t-body flex items-center gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-[var(--ink-strong)]" strokeWidth={2.5} />
                  {b}
                </li>
              ))}
            </ul>
          ) : null}

          {cta ? (
            <Button to="/docs" variant="secondary" className="mt-1">
              {cta}
            </Button>
          ) : null}
        </Reveal>

        <Reveal delay={120} className={cn(reversed && "lg:order-1")}>
          {card}
        </Reveal>
      </div>
    </Section>
  );
}

/* --- capability bento (Corekit's "AI that works with you") ---------------- */

function CapabilityBento() {
  return (
    <Section wide>
      <TitleBlock
        title="Every answer is traceable"
        sub="Ask it anything about your obligations. Every answer is grounded only in your approved obligations, evidence and live compliance records."
      />

      <div className="grid w-full gap-4 lg:grid-cols-2">
        <Reveal className="h-full">
          <div className="card-bordered flex h-full flex-col gap-6 p-6">
            <div className="flex-1">
              <CopilotChatCard />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="t-label">Copilot</h3>
              <p className="t-body">
                Grounded answers over your live obligations, rules and tasks, with the source clause attached to
                every one.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100} className="h-full">
          <div className="card-bordered flex h-full flex-col gap-6 p-6">
            <div className="flex-1">
              <ProcessingWindowCard />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="t-label">Every run, on the record</h3>
              <p className="t-body">
                What was read, what was set aside, what needed a person — recorded per run and exportable with the
                audit package.
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-3">
        {[
          {
            card: <AutomationListCard />,
            title: "Automation",
            body: "Alerts, deadline calendars and department assignment, triggered from the obligations themselves.",
          },
          {
            card: <EvidenceCard />,
            title: "Evidence",
            body: "Templates per rule type, collected into an audit package as PDF and XLSX.",
          },
          {
            card: <ConnectorCloudCard />,
            title: "Connectors",
            body: "Sit alongside the tools your team already uses — each one honest about whether it is connected.",
          },
        ].map((c, i) => (
          <Reveal key={c.title} delay={i * 90} className="h-full">
            <div className="card-bordered flex h-full flex-col gap-6 p-6">
              <div className="flex min-h-[210px] flex-1 items-center justify-center">{c.card}</div>
              <div className="flex flex-col gap-2">
                <h3 className="t-label">{c.title}</h3>
                <p className="t-body">{c.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* --- integrations field (Corekit's dashed-grid section) ------------------- */

function Integrations() {
  return (
    <Section wide id="engine" className="overflow-hidden">
      <IntegrationField>
        <div className="mx-auto flex max-w-[560px] flex-col items-center gap-5 text-center">
          <Reveal>
            <AccentEyebrow icon={Blocks} tone="green">
              Connectors
            </AccentEyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="t-h2">Works with the systems you already use</h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="t-body">
              Tier 1 connectors are live and connection-tested in the shipped demo. Tier 2 need your firm's own
              accounts, so they say not connected until you supply them.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <Button to="/docs/integrations">Explore connectors</Button>
          </Reveal>
        </div>
      </IntegrationField>
    </Section>
  );
}

/* --- enterprise trust, as four concrete guarantees ------------------------ */

const TRUST: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Server,
    title: "On-premise deployment",
    body: "Runs inside your own infrastructure.",
  },
  {
    icon: ScrollText,
    title: "Immutable audit trail",
    body: "Every decision is append-only and cannot be rewritten.",
  },
  {
    icon: Users,
    title: "Role-based access",
    body: "Separate permissions across departments.",
  },
  {
    icon: Lock,
    title: "Zero external processing",
    body: "Regulatory documents never leave your network.",
  },
];

function Assurance() {
  return (
    <Section wide>
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 text-center">
        <Reveal>
          <AccentEyebrow icon={ShieldCheck} tone="amber">
            Assurance
          </AccentEyebrow>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="t-h2">Enterprise-grade by design</h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="t-body">
            Deployed inside your perimeter, with an audit log that cannot be rewritten and access scoped by
            department.
          </p>
        </Reveal>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map((t, i) => {
          const Icon = t.icon;
          return (
            <Reveal key={t.title} delay={i * 90} className="h-full">
              <div className="card-bordered flex h-full flex-col p-6">
                <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[var(--panel)]">
                  <Icon className="h-[18px] w-[18px] text-[var(--ink)]" strokeWidth={1.8} />
                </span>
                <h3 className="t-title mt-5">{t.title}</h3>
                <p className="t-body mt-1.5">{t.body}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* --- what the platform does, stated as capability not demo statistics ----- */

const CAPABILITIES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Link2,
    title: "Source traceability",
    body: "Every obligation links back to the clause it came from.",
  },
  {
    icon: UserCheck,
    title: "Human review",
    body: "No obligation becomes a task without officer approval.",
  },
  {
    icon: Workflow,
    title: "Workflow automation",
    body: "Owners, deadlines and evidence assigned automatically.",
  },
  {
    icon: Package,
    title: "Audit ready",
    body: "Export complete evidence packages as PDF and XLSX.",
  },
];

function Capabilities() {
  return (
    <Section id="platform" wide>
      <div className="rule-t rule-b grid w-full gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES.map((c, i) => {
          const Icon = c.icon;
          return (
            <Reveal key={c.title} delay={i * 80}>
              <Icon className="h-5 w-5 text-[var(--ink)]" strokeWidth={1.8} />
              <h3 className="t-title mt-4">{c.title}</h3>
              <p className="t-body mt-1.5 max-w-[240px]">{c.body}</p>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* --- FAQ: two columns, left-aligned title (as in the reference) ----------- */

const FAQS = [
  [
    "Does any regulatory text leave our network?",
    "No. Circulars are read, analysed and indexed entirely on servers you control, and no regulatory text is sent to any outside service. That is the property that makes PRAXIS deployable inside a regulated intermediary at all.",
  ],
  [
    "Can PRAXIS invent an obligation that isn't in the circular?",
    "Every obligation carries the verbatim clause it came from, and nothing reaches rule generation until a compliance officer approves it at the review gate. The copilot answers only from your live obligations, rules and tasks — never from general knowledge.",
  ],
  [
    "How does it cope with a 400-page master circular?",
    "PRAXIS sets background recitals aside, compares the text against what you already hold, and identifies what it can from its built-in SEBI rulebook — reserving closer analytical review for the wording that is genuinely open. On the 151-section demo circular that meant 18 analysis passes instead of roughly 130.",
  ],
  [
    "Is the SEBI SCORES connection live?",
    "No, and it does not pretend to be. Filing and response status is a field the officer enters, carried through to the audit export. Connectors that need your own credentials — Slack, Jira, Drive, DocuSign — show as not connected until you supply them.",
  ],
  [
    "What comes out at the end?",
    "Checkable rules, workflow tasks with owners and deadlines, evidence templates for each rule type, a live compliance map of how obligations relate, and an audit package exported as PDF plus XLSX with the source clause on every row.",
  ],
  [
    "How is AI used?",
    "It assists with identifying obligations and drafting the structured output that follows from them. It never decides anything on its own: every obligation passes through mandatory human review before it becomes part of the compliance workflow, and every answer it gives cites the clause it came from.",
  ],
  [
    "What does it take to deploy?",
    "One command brings up the whole stack on your own infrastructure — application, database, queue, sign-on and search. The deployment guide in the docs covers both the local and the on-premise path.",
  ],
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="flex w-full items-start justify-center px-5 pb-[60px] pt-20 sm:px-[30px] lg:px-[200px] lg:pb-20 lg:pt-[134px]">
      <div className="flex w-full max-w-[820px] flex-col gap-12 md:flex-row md:items-start">
        <div className="flex flex-[0.6] flex-col items-start gap-4">
          <Reveal>
            <span className="t-eyebrow inline-flex items-center gap-1.5">
              <CircleHelp className="h-4 w-4" strokeWidth={2.2} />
              FAQ
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="t-h2 text-left">Frequently asked questions</h2>
          </Reveal>
        </div>

        <div className="flex flex-1 flex-col">
          {FAQS.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <Reveal key={q} delay={i * 40}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className={cn("rule-b w-full py-5 text-left", i === 0 && "rule-t")}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex-1 text-[16px] font-normal leading-6 tracking-[-0.2px] text-[var(--ink)]">
                      {q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0 text-[var(--ink-2)] transition-transform duration-300 [transition-timing-function:var(--ease)]",
                        isOpen && "rotate-180",
                      )}
                    />
                  </div>
                  <div className={cn("acc-body", isOpen && "open")}>
                    <div>
                      <p className="t-answer pt-3">{a}</p>
                    </div>
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* --- closing CTA: a WHITE card with soft blobs (as in the reference) ------ */

function ClosingCta() {
  return (
    <Section pad="cta">
      <Reveal className="w-full">
        <div className="relative w-full overflow-hidden rounded-[var(--r-card)] bg-[var(--card)] px-6 py-20 text-center shadow-[var(--shadow-1)]">
          <span className="blob left-[10%] top-[-10%] h-[220px] w-[220px] bg-[#e6e6e6]" aria-hidden="true" />
          <span className="blob bottom-[-20%] right-[8%] h-[260px] w-[260px] bg-[#ededed]" aria-hidden="true" />
          <span className="blob left-1/2 top-1/3 h-[180px] w-[180px] bg-[#f0f0f0]" aria-hidden="true" />

          <div className="relative flex flex-col items-center gap-4">
            <h2 className="t-h2 mx-auto max-w-[560px] text-balance">
              Stop reconstructing compliance from memory
            </h2>
            <p className="t-body mx-auto max-w-[460px]">
              Open the demo workspace on the shipped circular and follow one obligation from clause to audit
              evidence.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Button to="/login">
                Open the demo workspace
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Button>
              <Button to="/docs" variant="secondary">
                View documentation
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* --- footer --------------------------------------------------------------- */

const FOOTER_COLS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Workspace", to: "/login" },
      { label: "Documentation", to: "/docs" },
      { label: "Deployment guide", to: "/docs/cloud" },
    ],
  },
  {
    title: "How it works",
    links: [
      { label: "Core concepts", to: "/docs/core-concepts" },
      { label: "Modules", to: "/docs/modules" },
      { label: "Integrations", to: "/docs/integrations" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Security", to: "/docs/security" },
      { label: "Administration", to: "/docs/administration" },
      { label: "Release notes", to: "/docs/release-notes" },
    ],
  },
];

function Footer() {
  return (
    <footer className="flex w-full justify-center px-5 pb-20 pt-[60px] sm:px-[30px] lg:px-[200px]">
      <div className="flex w-full max-w-[820px] flex-col gap-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center gap-1.5">
              <Logo className="h-[18px] w-[18px] text-[var(--ink)]" />
              <span className="text-[16px] font-semibold lowercase leading-[18px] tracking-[-0.4px]">praxis</span>
            </div>
            <p className="t-body-sm max-w-[260px]">
              The agentic compliance platform for India's securities market. Runs on your servers, reviewed by your
              people, audit-ready output.
            </p>
            <div className="flex items-center gap-2">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--ink)]" />
              <span className="mono text-[11px] text-[var(--ink-2)]">Demo circular ingested · 275 obligations</span>
            </div>
          </div>

          <div className="flex flex-1 gap-6">
            {FOOTER_COLS.map((col) => (
              <div key={col.title} className="flex-1">
                <h3 className="text-[14px] font-semibold leading-4 text-[var(--ink)]">{col.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        className="t-body-sm group inline-flex items-center gap-1 transition-colors duration-200 hover:text-[var(--ink)]"
                      >
                        {l.label}
                        <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="rule-t flex flex-col items-center justify-between gap-3 pt-6 sm:flex-row">
          <span className="mono text-[11px] text-[var(--ink-3)]">SEBI TechSprint 2026 · PS2 Agentic Compliance</span>
          <a
            href="https://github.com"
            className="mono inline-flex items-center gap-1.5 text-[11px] text-[var(--ink-3)] transition-colors duration-200 hover:text-[var(--ink)]"
          >
            <Github className="h-3.5 w-3.5" />
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}

/** The reference's fixed bottom-right pill. */
function FloatingCta() {
  return (
    <Link
      to="/login"
      className="fixed bottom-5 right-5 z-40 hidden items-center gap-2 rounded-[var(--r-btn)] bg-[var(--card)] py-[9px] pl-[14px] pr-[15px] shadow-[var(--shadow-2)] transition-transform duration-300 [transition-timing-function:var(--ease)] hover:-translate-y-0.5 lg:inline-flex"
    >
      <Logo className="h-[18px] w-[18px] text-[var(--ink)]" />
      <span className="text-[14px] font-semibold leading-[14px] tracking-[-0.2px] text-[var(--ink)]">
        Open demo workspace
      </span>
    </Link>
  );
}

/* --- page ----------------------------------------------------------------- */

export default function Landing() {
  useEffect(() => {
    const prev = document.title;
    document.title = "PRAXIS — Turn SEBI circulars into audit-ready compliance";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="praxis-landing min-h-screen">
      {/* The reference caps the whole page at 1200px on the canvas colour. */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center overflow-hidden">
        <Nav />
        <main className="flex w-full flex-col items-center">
          <Hero />
          <IntermediaryStrip />
          <WhyPraxis />
          <HowItWorks />
          <WorkflowCards />
          <FeatureRow
            tone="blue"
            eyebrow="Circular intake"
            eyebrowIcon={ScanText}
            title="Drop in a circular. Get back obligations."
            body="Typed or scanned, PRAXIS recovers the section structure, resolves cross-references, and lists what the document actually requires of you."
            bullets={["Typed and scanned circulars", "Cross-references resolved", "Amendments compared automatically"]}
            cta="See how it reads a circular"
            card={<IntakeCard />}
          />
          <FeatureRow
            tone="green"
            eyebrow="Analytics"
            eyebrowIcon={Gauge}
            title="Track every obligation end-to-end"
            body="Track what has been reviewed, what is overdue, and how much of the reading PRAXIS handled on its own — recorded on every run."
            bullets={["Live review queue", "Filing deadline tracking", "Automation recorded per run"]}
            cta="Learn more"
            card={<AnalyticsCard />}
            reversed
          />
          <CapabilityBento />
          <Integrations />
          <Assurance />
          <Capabilities />
          <Faq />
          <ClosingCta />
        </main>
        <Footer />
      </div>
      <FloatingCta />
    </div>
  );
}

import { Link } from "react-router-dom";
import {
  Rocket,
  Upload,
  Building2,
  Settings,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { useRef } from "react";
import { DOCS_NAV, DOC_PAGES, getDocPage } from "@/docs";
import { DocsShell } from "@/components/docs/DocsShell";
import { readingMinutes } from "../../components/docs/docs-utils";

const QUICK_STARTS: { title: string; slug: string; icon: LucideIcon; description: string }[] = [
  {
    title: "Deploy PRAXIS",
    slug: "cloud",
    icon: Rocket,
    description: "Run PRAXIS on your own infrastructure.",
  },
  {
    title: "Upload First Circular",
    slug: "upload-first-circular",
    icon: Upload,
    description: "Turn a regulatory document into obligations.",
  },
  {
    title: "Create Organization",
    slug: "organizations",
    icon: Building2,
    description: "Set up your firm, departments and owners.",
  },
  {
    title: "Configure Compliance Workspace",
    slug: "first-workspace",
    icon: Settings,
    description: "Tailor PRAXIS to how your team works.",
  },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]">{children}</h2>
  );
}

export default function DocsHome() {
  const mainRef = useRef<HTMLElement>(null);
  return (
    <DocsShell wide mainRef={mainRef}>
    <div>
      <header className="pt-12 pb-8 text-center">
        <h1 style={{ fontFamily: "var(--display-font)" }} className="text-[32px] leading-[36px] font-semibold tracking-[-0.022em] text-[var(--ink)]">Documentation</h1>
        <p className="mt-1 text-[var(--t-sm)] tracking-[var(--ls-sm)] text-[var(--ink-3)]">
          PRAXIS Enterprise Compliance · {DOC_PAGES.length} articles · Last updated{" "}
          {getDocPage("introduction")?.updated}
        </p>
        <p className="mx-auto mt-4 max-w-[624px] text-[var(--t-lead)] leading-[var(--l-lead)] text-[var(--ink-2)]">
          Everything you need to deploy, configure, and operate PRAXIS across your organization. Onboard your teams,
          process regulations, manage obligations, automate workflows, and integrate with the systems you already use.
        </p>
      </header>

      <section>
        <SectionLabel>Quick start</SectionLabel>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_STARTS.map(({ title, slug, icon: Icon, description }) => {
            const page = getDocPage(slug);
            return (
              <Link
                key={slug}
                to={`/docs/${slug}`}
                className="group flex flex-col justify-between rounded-[10px] border border-[var(--line)] p-3 transition-all duration-140 hover:border-[var(--line-2)] hover:bg-[var(--surface)]"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--ink-3)] transition-colors duration-120 group-hover:text-[var(--ink)]" />
                  <span className="text-[var(--t-sm)] font-semibold tracking-[var(--ls-sm)] text-[var(--ink)]">{title}</span>
                </div>
                <div className="mt-1">
                  <p className="text-[13px] leading-[1.5] text-[var(--ink-3)]">{description}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink-4)]">{page ? `${readingMinutes(page)} min read` : ""}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <SectionLabel>Browse documentation</SectionLabel>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DOCS_NAV.map((section) => (
            <div key={section.id} className="flex flex-col rounded-[10px] border border-[var(--line)] p-3">
              <Link
                to={`/docs/${section.pages[0].slug}`}
                className="inline-flex items-center gap-1.5 text-[var(--t-sm)] font-semibold tracking-[var(--ls-sm)] text-[var(--ink)] transition-colors duration-120 hover:text-[var(--ink-2)]"
              >
                {section.title}
                <ArrowRight className="h-3.5 w-3.5 text-[var(--ink-3)]" />
              </Link>
              <ul className="mt-3 space-y-2">
                {section.pages.map((p) => (
                  <li key={p.slug}>
                    <Link
                      to={`/docs/${p.slug}`}
                      className="block text-[var(--t-sm)] tracking-[var(--ls-sm)] leading-[24px] text-[var(--ink-3)] transition-colors duration-120 hover:text-[var(--ink)]"
                    >
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
    </DocsShell>
  );
}

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
    <h2 className="mb-5 text-[14px] font-semibold uppercase tracking-wider text-[#6B7280]">{children}</h2>
  );
}

export default function DocsHome() {
  const mainRef = useRef<HTMLElement>(null);
  return (
    <DocsShell wide mainRef={mainRef}>
    <div>
      <header className="py-16 text-center">
        <h1 className="text-[56px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#111827]">Documentation</h1>
        <p className="mt-5 text-[14px] text-[#6B7280]">
          PRAXIS Enterprise Compliance · {DOC_PAGES.length} articles · Last updated{" "}
          {getDocPage("introduction")?.updated}
        </p>
        <p className="mx-auto mt-8 max-w-[70ch] text-[18px] leading-[1.8] text-[#374151]">
          Everything you need to deploy, configure, and operate PRAXIS across your organization. Onboard your teams,
          process regulations, manage obligations, automate workflows, and integrate with the systems you already use.
        </p>
      </header>

      <section className="mt-4">
        <SectionLabel>Quick Start</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_STARTS.map(({ title, slug, icon: Icon, description }) => {
            const page = getDocPage(slug);
            return (
              <Link
                key={slug}
                to={`/docs/${slug}`}
                className="group flex h-[120px] flex-col justify-between rounded-[16px] border border-[#E5E7EB] p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#D1D5DB]"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-[#9CA3AF] transition-colors duration-150 group-hover:text-[#111827]" />
                  <span className="text-[15px] font-semibold leading-tight text-[#111827]">{title}</span>
                </div>
                <div>
                  <p className="text-[13px] leading-5 text-[#6B7280]">{description}</p>
                  <p className="mt-1.5 text-[12px] text-[#9CA3AF]">{page ? `${readingMinutes(page)} min read` : ""}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-20">
        <SectionLabel>Browse Documentation</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOCS_NAV.map((section) => (
            <div key={section.id} className="flex flex-col rounded-[16px] border border-[#E5E7EB] p-6">
              <Link
                to={`/docs/${section.pages[0].slug}`}
                className="inline-flex items-center gap-1.5 text-[15px] font-bold text-[#111827] transition-colors duration-150 hover:text-[#6B7280]"
              >
                {section.title}
                <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF]" />
              </Link>
              <ul className="mt-4 space-y-2">
                {section.pages.map((p) => (
                  <li key={p.slug}>
                    <Link
                      to={`/docs/${p.slug}`}
                      className="block text-[14px] leading-6 text-[#6B7280] transition-colors duration-150 hover:text-[#111827]"
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

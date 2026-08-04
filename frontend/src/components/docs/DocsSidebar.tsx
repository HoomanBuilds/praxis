import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Home,
  Rocket,
  Layers,
  Workflow,
  LayoutGrid,
  Users,
  Zap,
  Plug,
  Code2,
  Server,
  Shield,
  BookOpen,
  History,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { DOCS_NAV, DOC_PAGES, findSection } from "@/docs";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<string, LucideIcon> = {
  "getting-started": Rocket,
  "core-concepts": Layers,
  "compliance-workflow": Workflow,
  modules: LayoutGrid,
  administration: Users,
  automation: Zap,
  integrations: Plug,
  developers: Code2,
  deployment: Server,
  security: Shield,
  reference: BookOpen,
  "release-notes": History,
};

export function DocsSidebar({ currentSlug, onNavigate }: { currentSlug?: string; onNavigate?: () => void }) {
  const [q, setQ] = useState("");
  const activeSection = currentSlug ? findSection(currentSlug)?.id : undefined;
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return null;
    return DOC_PAGES.filter(
      (p) => p.title.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle),
    );
  }, [q]);

  const isOpen = (id: string) => open[id] ?? true;

  return (
    <div className="docs-font flex h-full flex-col">
      <div className="px-4 pt-5 pb-3">
        <Link
          to="/docs"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-[5px] py-0 text-[var(--t-side)] leading-[var(--l-sm)] tracking-[var(--ls-sm)] text-[var(--ink-3)] transition-colors duration-120 hover:text-[var(--ink-2)]",
            "min-h-[36px]",
            !currentSlug && "text-[var(--ink)]",
          )}
        >
          <Home className="h-4 w-4 opacity-45" />
          Documentation
        </Link>
      </div>

      <div className="px-5 pb-3">
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="h-9 w-full rounded-lg border border-[var(--line-2)] bg-[var(--surface-2)] pl-3 pr-3 text-[var(--t-sm)] tracking-[var(--ls-sm)] text-[var(--ink)] transition-colors duration-120 placeholder:text-[var(--ink-3)] hover:border-[var(--line-2)] focus:border-[var(--ink-4)] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-5">
        {results ? (
          <div className="space-y-0.5 pt-2">
            {results.length === 0 && (
              <p className="px-1 py-2 text-[13px] text-[var(--ink-3)]">No pages match "{q}".</p>
            )}
            {results.map((p) => (
              <Link
                key={p.slug}
                to={`/docs/${p.slug}`}
                onClick={onNavigate}
                className="flex h-8 items-center rounded-lg px-[5px] text-[var(--t-side)] tracking-[var(--ls-sm)] text-[var(--ink-3)] transition-colors duration-120 hover:text-[var(--ink-2)]"
              >
                {p.title}
              </Link>
            ))}
          </div>
        ) : (
          <div>
            {DOCS_NAV.map((section) => {
              const Icon = SECTION_ICONS[section.id] ?? BookOpen;
              const openSection = isOpen(section.id);
              const sectionActive = section.id === activeSection;
              return (
                <details
                  key={section.id}
                  className="group"
                  open={openSection}
                  onToggle={(e) => setOpen((o) => ({ ...o, [section.id]: (e.target as HTMLDetailsElement).open }))}
                >
                  <summary
                    className={cn(
                      "flex h-9 cursor-pointer items-center gap-3 rounded-lg px-[5px] text-[var(--t-side)] font-[var(--w-med)] tracking-[var(--ls-sm)] transition-colors duration-120 select-none",
                      sectionActive ? "text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink-2)]",
                    )}
                    style={{ listStyle: "none" }}
                  >
                    <Icon className="h-4 w-4 flex-none opacity-45 transition-opacity duration-120" style={{ opacity: sectionActive ? 1 : undefined }} />
                    <span className="flex-1">{section.title}</span>
                    <ChevronRight className="h-3.5 w-3.5 flex-none transition-transform duration-160 group-open:rotate-90" />
                  </summary>
                  <ul className="space-y-0 px-0 py-2 pl-2">
                    {section.pages.map((p) => (
                      <li key={p.slug}>
                        <Link
                          to={`/docs/${p.slug}`}
                          onClick={onNavigate}
                          className={cn(
                            "flex h-8 items-center rounded-lg px-[5px] text-[var(--t-side)] font-[var(--w-med)] tracking-[var(--ls-sm)] text-[var(--ink-3)] transition-colors duration-120 hover:text-[var(--ink-2)]",
                            p.slug === currentSlug && "text-[var(--ink)]",
                          )}
                        >
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap">{p.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-[var(--line)] px-5 py-5">
        <div className="space-y-0">
          <Link
            to="/docs/latest-release"
            onClick={onNavigate}
            className="flex min-h-[36px] items-center rounded-lg px-[5px] text-[var(--t-side)] font-[var(--w-med)] tracking-[var(--ls-sm)] text-[var(--ink-3)] transition-colors duration-120 hover:text-[var(--ink)]"
          >
            <History className="h-4 w-4 flex-none mr-3" />
            Latest Release
          </Link>
          <Link
            to="/"
            className="flex min-h-[36px] items-center rounded-lg px-[5px] text-[var(--t-side)] font-[var(--w-med)] tracking-[var(--ls-sm)] text-[var(--ink-3)] transition-colors duration-120 hover:text-[var(--ink)]"
          >
            <ArrowUpRight className="h-4 w-4 flex-none mr-3" />
            Open PRAXIS
          </Link>
        </div>
      </div>
    </div>
  );
}

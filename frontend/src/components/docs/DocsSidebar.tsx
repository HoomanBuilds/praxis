import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Search,
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
      <div className="px-3">
        <Link
          to="/docs"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[15px] text-[#6B7280] transition-colors duration-150 hover:bg-[#F9FAFB] hover:text-[#111827]",
            !currentSlug && "bg-[#F3F4F6] font-medium text-[#111827]",
          )}
        >
          <Home className="h-4 w-4 text-[#9CA3AF]" />
          Documentation
        </Link>
      </div>

      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search docs..."
            className="h-10 w-full rounded-[12px] border border-[#E5E7EB] bg-white pl-10 pr-3.5 text-[15px] text-[#111827] transition-colors duration-150 placeholder:text-[#9CA3AF] hover:border-[#D1D5DB] focus:border-[#9CA3AF] focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-1">
        {results ? (
          <div className="space-y-0.5 pt-4">
            {results.length === 0 && (
              <p className="px-3 py-2 text-sm text-[#9CA3AF]">No pages match “{q}”.</p>
            )}
            {results.map((p) => (
              <Link
                key={p.slug}
                to={`/docs/${p.slug}`}
                onClick={onNavigate}
                className="block rounded-[10px] px-3 py-2 text-[15px] text-[#6B7280] transition-colors duration-150 hover:bg-[#F9FAFB] hover:text-[#111827]"
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
              const active = section.id === activeSection;
              return (
                <div key={section.id}>
                  <button
                    onClick={() => setOpen((o) => ({ ...o, [section.id]: !isOpen(section.id) }))}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[10px] px-3 pt-8 pb-1 text-left text-[14px] font-semibold text-[#111827] transition-colors duration-150 hover:text-[#111827]",
                      active && "text-[#111827]",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 text-[#9CA3AF]", active && "text-[#111827]")} />
                    <span className="flex-1">{section.title}</span>
                    {openSection ? (
                      <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-[#9CA3AF]" />
                    )}
                  </button>
                  {openSection && (
                    <div className="mt-1 space-y-0.5">
                      {section.pages.map((p) => (
                        <Link
                          key={p.slug}
                          to={`/docs/${p.slug}`}
                          onClick={onNavigate}
                          className={cn(
                            "block rounded-[10px] px-3 py-[7px] text-[15px] text-[#6B7280] transition-colors duration-150 hover:bg-[#F9FAFB] hover:text-[#111827]",
                            p.slug === currentSlug && "bg-[#F3F4F6] font-medium text-[#111827] hover:bg-[#F3F4F6]",
                          )}
                        >
                          {p.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-[#E5E7EB] px-3 pb-4 pt-3">
        <div className="space-y-0.5">
          <Link
            to="/docs/latest-release"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[15px] text-[#6B7280] transition-colors duration-150 hover:bg-[#F9FAFB] hover:text-[#111827]"
          >
            <History className="h-4 w-4 text-[#9CA3AF]" />
            Latest Release
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[15px] text-[#6B7280] transition-colors duration-150 hover:bg-[#F9FAFB] hover:text-[#111827]"
          >
            <ArrowUpRight className="h-4 w-4 text-[#9CA3AF]" />
            Open PRAXIS
          </Link>
        </div>
      </div>
    </div>
  );
}

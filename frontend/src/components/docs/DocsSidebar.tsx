import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Home, Search } from "lucide-react";
import { DOCS_NAV, DOC_PAGES } from "@/docs";
import { findSection } from "@/docs";
import { cn } from "@/lib/utils";

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
    <div className="flex h-full flex-col">
      <div className="px-3 pb-3">
        <Link
          to="/docs"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors",
            !currentSlug && "bg-gray-100 text-gray-900",
          )}
        >
          <Home className="h-4 w-4 text-gray-400" />
          Documentation
        </Link>
      </div>

      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search docs…"
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-100"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {results ? (
          <div className="space-y-0.5">
            {results.length === 0 && <p className="px-2 py-2 text-xs text-gray-400">No pages match “{q}”.</p>}
            {results.map((p) => (
              <Link
                key={p.slug}
                to={`/docs/${p.slug}`}
                onClick={onNavigate}
                className="block rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                {p.title}
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {DOCS_NAV.map((section) => {
              const openSection = isOpen(section.id);
              const active = section.id === activeSection;
              return (
                <div key={section.id}>
                  <button
                    onClick={() => setOpen((o) => ({ ...o, [section.id]: !isOpen(section.id) }))}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-semibold tracking-wide text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors",
                      active && "text-gray-900",
                    )}
                  >
                    {openSection ? (
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                    )}
                    {section.title}
                  </button>
                  {openSection && (
                    <div className="mt-0.5 space-y-0.5 border-l border-gray-100 ml-3 pl-2">
                      {section.pages.map((p) => (
                        <Link
                          key={p.slug}
                          to={`/docs/${p.slug}`}
                          onClick={onNavigate}
                          className={cn(
                            "block rounded-md px-2 py-1 text-[13px] text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors",
                            p.slug === currentSlug && "bg-gray-100 font-medium text-gray-900",
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
    </div>
  );
}

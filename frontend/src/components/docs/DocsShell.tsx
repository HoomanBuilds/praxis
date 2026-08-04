import { type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { DocsSidebar } from "./DocsSidebar";
import { cn } from "@/lib/utils";

export function DocsShell({
  currentSlug,
  onNavigate,
  toc,
  children,
  mainRef,
}: {
  currentSlug?: string;
  onNavigate?: () => void;
  toc?: ReactNode;
  children: ReactNode;
  mainRef: React.RefObject<HTMLElement>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = () => {
    setMobileOpen(false);
    onNavigate?.();
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-gray-900">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:block"
          aria-label="Toggle navigation"
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
        <Link to="/docs" onClick={go} className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-[13px] font-bold text-white">
            P
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-gray-900">PRAXIS</span>
          <span className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
            Documentation
          </span>
        </Link>
        <div className="flex-1" />
        <Link
          to="/"
          className="hidden items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 sm:inline-flex"
        >
          Open PRAXIS
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4">
              <span className="text-sm font-semibold text-gray-900">Documentation</span>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Close navigation">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3">
              <DocsSidebar currentSlug={currentSlug} onNavigate={go} />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "hidden shrink-0 border-r border-gray-200 bg-gray-50/50 transition-[width] duration-200 lg:block",
            collapsed ? "w-0" : "w-72",
          )}
        >
          <div className={cn("h-full overflow-y-auto py-4", collapsed && "hidden")}>
            <DocsSidebar currentSlug={currentSlug} onNavigate={go} />
          </div>
        </aside>

        <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[760px] px-6 py-10 sm:px-10 sm:py-12">
            {children}
          </div>
        </main>

        <aside className="hidden w-64 shrink-0 xl:block">
          <div className="sticky top-0 max-h-screen overflow-y-auto py-10">{toc}</div>
        </aside>
      </div>
    </div>
  );
}

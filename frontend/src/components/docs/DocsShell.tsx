import { type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { DocsSidebar } from "./DocsSidebar";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

export function DocsShell({
  currentSlug,
  onNavigate,
  toc,
  children,
  mainRef,
  wide = false,
}: {
  currentSlug?: string;
  onNavigate?: () => void;
  toc?: ReactNode;
  children: ReactNode;
  mainRef: React.RefObject<HTMLElement>;
  wide?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = () => {
    setMobileOpen(false);
    onNavigate?.();
  };

  return (
    <div className="docs-font flex h-screen flex-col overflow-hidden bg-white text-[#111827]">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-[#E5E7EB] px-6">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F9FAFB] lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden rounded-lg p-2 text-[#6B7280] transition-colors duration-150 hover:bg-[#F9FAFB] lg:block"
          aria-label="Toggle navigation"
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
        <Link to="/docs" onClick={go} className="flex items-center gap-2.5">
          <Logo className="h-6 w-6 text-[#111827]" />
          <span className="text-[15px] font-semibold tracking-tight text-[#111827]">PRAXIS</span>
          <span className="rounded-full border border-[#E5E7EB] px-2.5 py-0.5 text-xs font-medium text-[#6B7280]">
            Documentation
          </span>
        </Link>
        <div className="flex-1" />
        <Link
          to="/"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#6B7280] transition-colors duration-150 hover:bg-[#F9FAFB] hover:text-[#111827]"
        >
          Open PRAXIS
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#111827]/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[290px] flex-col bg-white">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] px-4">
              <span className="text-sm font-semibold text-[#111827]">Documentation</span>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F9FAFB]" aria-label="Close navigation">
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
            "hidden shrink-0 border-r border-[#E5E7EB] transition-[width] duration-150 ease-out lg:block",
            collapsed ? "w-0" : "w-[290px]",
          )}
        >
          <div className={cn("h-full overflow-y-auto", collapsed && "hidden")}>
            <DocsSidebar currentSlug={currentSlug} onNavigate={go} />
          </div>
        </aside>

        <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              "w-full px-6 py-12 md:pl-[72px] md:pr-8",
              wide ? "md:max-w-[1080px]" : "md:max-w-[856px]",
            )}
          >
            {children}
          </div>
        </main>

        <aside className="hidden w-60 shrink-0 xl:block">
          <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">{toc}</div>
        </aside>
      </div>
    </div>
  );
}

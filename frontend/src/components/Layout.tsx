import type { ReactNode } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ScrollText, ListChecks, ClipboardList, Share2, Bot, BarChart3,
  FileBarChart, History, Settings as SettingsIcon, Search, Command, Bell, ChevronsUpDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CommandPalette, openCommandPalette } from "@/components/CommandPalette";
import { CopilotSidebar } from "@/components/CopilotSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { useCopilot } from "@/context/CopilotContext";

const navGroups: { heading: string; items: { to: string; label: string; icon: any; end?: boolean }[] }[] = [
  {
    heading: "Operate",
    items: [
      { to: "/", label: "Command Center", icon: LayoutDashboard, end: true },
      { to: "/documents", label: "Regulations", icon: ScrollText },
      { to: "/obligations", label: "Obligations", icon: ListChecks },
      { to: "/tasks", label: "Tasks", icon: ClipboardList },
    ],
  },
  {
    heading: "Intelligence",
    items: [
      { to: "/knowledge-graph", label: "Knowledge Graph", icon: Share2 },
      { to: "/copilot", label: "AI Copilot", icon: Bot },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    heading: "Records",
    items: [
      { to: "/reports", label: "Reports", icon: FileBarChart },
      { to: "/audit", label: "Audit Trail", icon: History },
    ],
  },
];

export function Layout({ children }: { children: ReactNode }) {
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: api.health, staleTime: 60000 });
  const location = useLocation();
  const copilot = useCopilot();
  const llmUp = Boolean(health?.["llm"] && (health["llm"] as any).available);

  const navItem = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors border",
      active
        ? "bg-card border-border shadow-[0_1px_2px_0_hsl(220_43%_11%/0.06)] text-foreground font-medium"
        : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
    );

  return (
    <div className={cn("min-h-screen bg-background p-4 transition-[padding] duration-200", copilot.open && "pr-[25rem]")}>
      <CommandPalette />
      <CopilotSidebar />
      <div className="flex h-[calc(100vh-2rem)] overflow-hidden rounded-3xl border bg-card shadow-[0_10px_50px_-16px_hsl(224_40%_20%/0.16)]">
        {/* Sidebar (inside the shell) */}
        <aside className="w-60 shrink-0 border-r flex flex-col px-3 py-4 overflow-y-auto">
          <div className="px-2 mb-6 flex items-center gap-2">
            <Logo className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-lg font-semibold tracking-tight lowercase">praxis</span>
          </div>
          <nav className="space-y-4 flex-1">
            {navGroups.map((group) => (
              <div key={group.heading}>
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{group.heading}</div>
                <div className="space-y-0.5">
                  {group.items.map((n) => {
                    const active = n.end ? location.pathname === n.to : location.pathname.startsWith(n.to);
                    return (
                      <NavLink key={n.to} to={n.to} className={navItem(active)}>
                        <n.icon className="h-4 w-4" />
                        {n.label}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="pt-2 mt-2 border-t">
            <NavLink to="/settings" className={navItem(location.pathname.startsWith("/settings"))}>
              <SettingsIcon className="h-4 w-4" /> Settings
            </NavLink>
          </div>
          <div className="mt-3 rounded-xl border bg-secondary px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", llmUp ? "bg-success pulse-dot" : "bg-destructive")} />
              <span className="truncate">
                {llmUp ? "Local LLM online" : "LLM offline"}
                {health?.["model"] ? ` · ${health["model"]}` : ""}
              </span>
            </div>
          </div>
        </aside>

        {/* Content column */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-16 shrink-0 border-b flex items-center gap-3 px-5">
            <button
              onClick={openCommandPalette}
              className="group flex items-center gap-2 rounded-xl border bg-secondary px-3.5 h-9 text-sm text-muted-foreground hover:border-primary/40 transition-colors w-full max-w-md"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">Search…</span>
              <kbd className="flex items-center gap-0.5 text-[10px] border rounded px-1.5 py-0.5">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>
            <div className="ml-auto flex items-center gap-1.5">
              <ThemeToggle />
              <button
                onClick={copilot.toggle}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-3 h-9 text-sm transition-colors",
                  copilot.open ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
              >
                <Bot className="h-3.5 w-3.5" /> Copilot
              </button>
              <Link to="/audit" title="Audit trail" className="relative grid h-9 w-9 place-items-center rounded-xl border bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <Bell className="h-4 w-4" />
              </Link>
              <div className="flex items-center gap-2 pl-1.5">
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 grid place-items-center text-xs font-semibold text-primary">CO</div>
                <div className="hidden sm:block leading-tight">
                  <div className="text-xs font-medium">Compliance Officer</div>
                  <div className="text-[10px] text-muted-foreground">Reviewer</div>
                </div>
                <ChevronsUpDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ScrollText, ListChecks, ClipboardList, Share2, Bot, BarChart3,
  FileBarChart, History, Settings as SettingsIcon, Search, Command, Bell,
  FileCheck, CalendarClock, Radar, LogOut, Shield, FileOutput, BookOpen,
  Menu, X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CommandPalette, openCommandPalette } from "@/components/CommandPalette";
import { CopilotSidebar } from "@/components/CopilotSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { useCopilot } from "@/context/CopilotContext";
import { useAuth } from "@/context/AuthContext";
import { useVocab } from "@/hooks/useVocab";
import type { TermKey } from "@/lib/vocab/terms";

// `termKey` overrides `label` when set, so a nav entry can read differently in business
// and engineering mode. Routes never change — deep links and the command palette depend
// on them staying stable.
const navGroups: {
  heading: string;
  items: { to: string; label: string; termKey?: TermKey; icon: any; end?: boolean }[];
}[] = [
  {
    heading: "Operate",
    items: [
      { to: "/", label: "Command Center", icon: LayoutDashboard, end: true },
      { to: "/documents", label: "Regulations", icon: ScrollText },
      { to: "/obligations", label: "Obligations", icon: ListChecks },
      { to: "/tasks", label: "Tasks", icon: ClipboardList },
      { to: "/evidence", label: "Evidence Center", icon: FileCheck },
      { to: "/calendar", label: "Calendar", icon: CalendarClock },
      { to: "/filings", label: "Filing Tracker", icon: FileOutput },
    ],
  },
  {
    heading: "Intelligence",
    items: [
      { to: "/knowledge-graph", label: "Compliance Map", termKey: "nav.knowledge_graph", icon: Share2 },
      { to: "/risk-register", label: "Risk Register", icon: Shield },
      { to: "/copilot", label: "Copilot", icon: Bot },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/watch", label: "Watch", termKey: "nav.watch", icon: Radar },
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
  const { user, logout } = useAuth();
  const { t, isBusiness } = useVocab();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const llmUp = Boolean(health?.["llm"] && (health["llm"] as any).available);

  useEffect(() => setMobileNavOpen(false), [location.pathname]);

  const navItem = (active: boolean) =>
    cn(
      "flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors lg:min-h-0",
      active
        ? "bg-card border-border shadow-[0_1px_2px_0_hsl(220_43%_11%/0.06)] text-foreground font-medium"
        : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
    );

  const sidebarContent = (mobile = false) => (
    <>
      <div className="px-2 mb-6 flex items-center gap-2 shrink-0">
        <Logo className="h-7 w-7 text-foreground" />
        <span className="text-lg font-semibold tracking-tight lowercase">praxis</span>
        {mobile && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="ml-auto grid h-11 w-11 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1" aria-label="Primary navigation">
        {navGroups.map((group) => (
          <div key={group.heading}>
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{group.heading}</div>
            <div className="space-y-0.5">
              {group.items.map((n) => {
                const active = n.end ? location.pathname === n.to : location.pathname.startsWith(n.to);
                return (
                  <NavLink key={n.to} to={n.to} className={navItem(active)}>
                    <n.icon className="h-4 w-4" />
                    {n.termKey ? t(n.termKey) : n.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="pt-2 mt-2 border-t space-y-0.5">
        <NavLink to="/docs" className={navItem(location.pathname.startsWith("/docs"))}>
          <BookOpen className="h-4 w-4" /> Documentation
        </NavLink>
        <NavLink to="/settings" className={navItem(location.pathname.startsWith("/settings"))}>
          <SettingsIcon className="h-4 w-4" /> Settings
        </NavLink>
      </div>
      <div className="mt-3 rounded-xl border bg-secondary px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("h-1.5 w-1.5 rounded-full", llmUp ? "bg-success pulse-dot" : "bg-destructive")} />
          <span className="truncate">
            {t(llmUp ? "settings.online" : "settings.offline")}
            {!isBusiness && health?.["model"] ? ` · ${health["model"]}` : ""}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <div className={cn("min-h-screen bg-background p-0 transition-[padding] duration-200 sm:p-3 lg:p-4", copilot.open && "xl:pr-[25rem]")}>
      <CommandPalette />
      <CopilotSidebar />
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/35"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,calc(100vw-3rem))] flex-col border-r bg-card px-3 py-4 shadow-xl">
            {sidebarContent(true)}
          </aside>
        </div>
      )}
      <div className="flex h-screen overflow-hidden bg-card sm:h-[calc(100vh-1.5rem)] sm:rounded-3xl sm:border sm:shadow-[0_10px_50px_-16px_hsl(224_40%_20%/0.16)] lg:h-[calc(100vh-2rem)]">
        {/* Sidebar (inside the shell) */}
        <aside className="hidden w-60 shrink-0 border-r px-3 py-4 lg:flex lg:flex-col">
          {sidebarContent()}
        </aside>

        {/* Content column */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-16 shrink-0 border-b flex items-center gap-2 px-3 sm:gap-3 sm:px-5">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border bg-secondary text-muted-foreground hover:text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={openCommandPalette}
              aria-label="Search workspace"
              className="group flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl border bg-secondary text-sm text-muted-foreground transition-colors hover:border-primary/40 sm:h-9 sm:w-full sm:max-w-md sm:justify-start sm:px-3.5"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden flex-1 text-left sm:block">Search…</span>
              <kbd className="hidden items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] sm:flex">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>
            <div className="ml-auto flex items-center gap-1.5">
              <ThemeToggle />
              <Link to="/notifications" aria-label="Notifications" title="Notifications" className="relative grid h-11 w-11 place-items-center rounded-xl border bg-secondary text-muted-foreground hover:text-foreground transition-colors sm:h-9 sm:w-9">
                <Bell className="h-4 w-4" />
              </Link>
              <div className="flex items-center gap-2 pl-1.5">
                <div className="hidden h-8 w-8 rounded-full bg-primary/10 border border-primary/20 place-items-center text-xs font-semibold text-primary sm:grid">{user?.name?.charAt(0)?.toUpperCase() ?? "U"}</div>
                <div className="hidden sm:block leading-tight">
                  <div className="text-xs font-medium">{user?.name || "User"}</div>
                  <div className="text-[10px] text-muted-foreground">{user?.role?.replace("_", " ") || "Viewer"}</div>
                </div>
                <button onClick={logout} aria-label="Sign out" title="Sign out" className="grid h-11 w-11 place-items-center rounded-xl border bg-secondary text-muted-foreground hover:text-foreground transition-colors sm:h-9 sm:w-9">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

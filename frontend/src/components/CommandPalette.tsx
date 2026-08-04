import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn, titleCase } from "@/lib/utils";
import { useVocab } from "@/hooks/useVocab";
import {
  Search, LayoutDashboard, FileText, Share2, Clock, CornerDownLeft, FileCheck2, ScrollText,
} from "lucide-react";

// Broadcast helper so any button can open the palette.
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent("praxis:open-command"));
}

interface Item {
  id: string;
  label: string;
  sublabel?: string;
  group: string;
  icon: ComponentType<{ className?: string }>;
  run: () => void;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const { t } = useVocab();
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("praxis:open-command", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("praxis:open-command", onOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setDebounced("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 160);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => api.search(debounced),
    enabled: open && debounced.length > 0,
  });

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const items = useMemo<Item[]>(() => {
    const nav: Item[] = [
      { id: "nav-dash", label: "Command Center", group: "Navigate", icon: LayoutDashboard, run: () => go("/") },
      { id: "nav-docs", label: "Regulations", group: "Navigate", icon: FileText, run: () => go("/documents") },
      { id: "nav-obl", label: "Obligations", group: "Navigate", icon: FileCheck2, run: () => go("/obligations") },
      { id: "nav-tasks", label: "Tasks", group: "Navigate", icon: FileText, run: () => go("/tasks") },
      { id: "nav-copilot", label: "Copilot", group: "Navigate", icon: FileCheck2, run: () => go("/copilot") },
      { id: "nav-analytics", label: "Analytics", group: "Navigate", icon: FileText, run: () => go("/analytics") },
      { id: "nav-reports", label: "Reports", group: "Navigate", icon: FileText, run: () => go("/reports") },
      { id: "nav-audit", label: "Audit Trail", group: "Navigate", icon: FileText, run: () => go("/audit") },
      { id: "nav-graph", label: t("nav.knowledge_graph"), group: "Navigate", icon: Share2, run: () => go("/knowledge-graph") },
    ];
    const q = debounced.toLowerCase();
    const filteredNav = q ? nav.filter((n) => n.label.toLowerCase().includes(q)) : nav;

    const docItems: Item[] = (results?.documents ?? []).map((d) => ({
      id: `doc-${d.id}`,
      label: d.title || d.reference || d.id.slice(0, 8),
      sublabel: d.reference,
      group: "Documents",
      icon: ScrollText,
      run: () => go(`/documents/${d.id}/review`),
    }));
    const obItems: Item[] = (results?.obligations ?? []).map((o) => ({
      id: `ob-${o.id}`,
      label: o.description.slice(0, 70),
      sublabel: `${o.identifier} · ${titleCase(o.functional_area)} · ${(o.confidence * 100).toFixed(0)}%`,
      group: "Obligations",
      icon: FileCheck2,
      run: () => go(`/documents/${o.document_id}/review`),
    }));
    return [...filteredNav, ...docItems, ...obItems];
  }, [results, debounced, t, go]);

  useEffect(() => setActive(0), [items.length]);

  const onListKey = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); items[active]?.run(); }
  };

  if (!open) return null;

  // group items preserving order
  const groups: { name: string; items: Item[] }[] = [];
  for (const it of items) {
    const g = groups.find((x) => x.name === it.group) ?? (groups.push({ name: it.group, items: [] }), groups[groups.length - 1]);
    g.items.push(it);
  }
  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" onMouseDown={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-xl rounded-xl border bg-popover shadow-2xl animate-in overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onListKey}
      >
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search obligations, documents, or jump to a page…"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto py-2">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {debounced ? "No matches." : "Type to search…"}
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.name} className="px-2 py-1">
                <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{g.name}</div>
                {g.items.map((it) => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <button
                      key={it.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => it.run()}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm",
                        idx === active ? "bg-accent text-accent-foreground" : "text-foreground/90"
                      )}
                    >
                      <it.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{it.label}</div>
                        {it.sublabel && <div className="truncate text-xs text-muted-foreground">{it.sublabel}</div>}
                      </div>
                      {idx === active && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> regulations + keywords</span>
          <span className="ml-auto flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> to select · ↑↓ to navigate</span>
        </div>
      </div>
    </div>
  );
}

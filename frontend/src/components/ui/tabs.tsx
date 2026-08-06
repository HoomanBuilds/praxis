import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({ value: "", onValueChange: () => {} });

export function Tabs({ value, onValueChange, children, className }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("space-y-3", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex max-w-full gap-1 overflow-x-auto border-b", className)}>{children}</div>;
}

export function TabTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  const active = ctx.value === value;
  return (
    <button
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "min-h-11 shrink-0 px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors sm:min-h-0",
        active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (ctx.value !== value) return null;
  return <div className={cn("animate-in", className)}>{children}</div>;
}

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Pulse({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function ListSkeleton({ label, rows = 5 }: { label: string; rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 border-t pt-4 first:border-0 first:pt-0" aria-hidden="true">
          <Pulse className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Pulse className="h-3 w-full max-w-lg" />
            <Pulse className="h-3 w-2/3 max-w-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({
  label = "Loading page",
  cards = 4,
  rows = 5,
}: {
  label?: string;
  cards?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-5" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="space-y-2" aria-hidden="true">
        <Pulse className="h-6 w-48" />
        <Pulse className="h-4 w-full max-w-md" />
      </div>
      {cards > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: cards }, (_, index) => (
            <Card key={index}>
              <CardContent className="space-y-3 pt-5">
                <Pulse className="h-3 w-24" />
                <Pulse className="h-7 w-16" />
                <Pulse className="h-3 w-32 max-w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Card aria-hidden="true">
        <CardContent className="space-y-4 pt-5">
          <Pulse className="h-4 w-36" />
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="flex items-center gap-4 border-t pt-4 first:border-0 first:pt-0">
              <Pulse className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Pulse className="h-3 w-full max-w-lg" />
                <Pulse className="h-3 w-2/3 max-w-sm" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function QueryError({
  title = "This page could not be loaded",
  message = "Check your connection and try again.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
}) {
  return (
    <Card role="alert">
      <CardContent className="flex flex-col items-start gap-4 py-8 sm:flex-row sm:items-center">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button variant="outline" onClick={onRetry}>Retry</Button>
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center", className)}>
      <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-sm font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

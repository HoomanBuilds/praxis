import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 w-full max-w-lg mx-4">{children}</div>
    </div>,
    document.body
  );
}

export function DialogContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-6 shadow-lg animate-in",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 mb-4", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex justify-end gap-2 mt-4", className)} {...props} />;
}

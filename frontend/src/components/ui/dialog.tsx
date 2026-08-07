import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const DialogTitleContext = React.createContext<string | undefined>(undefined);

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const titleId = React.useId();
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);
  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      const dialog = document.querySelector<HTMLElement>(
        `[role="dialog"][aria-labelledby="${titleId}"]`,
      );
      const firstControl = dialog?.querySelector<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href]",
      );
      (firstControl ?? dialog)?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChangeRef.current(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, titleId]);
  if (!open) return null;
  return (
    <DialogTitleContext.Provider value={titleId}>
      {createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <div className="relative z-50 w-full max-w-lg mx-4">{children}</div>
        </div>,
        document.body,
      )}
    </DialogTitleContext.Provider>
  );
}

export function DialogContent({ className, children, tabIndex, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const titleId = React.useContext(DialogTitleContext);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={tabIndex ?? -1}
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

export function DialogTitle({ className, id, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const titleId = React.useContext(DialogTitleContext);
  return <h2 id={id ?? titleId} className={cn("text-base font-semibold", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex justify-end gap-2 mt-4", className)} {...props} />;
}

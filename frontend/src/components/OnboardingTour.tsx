import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const OPEN_ONBOARDING_EVENT = "praxis:open-onboarding";
const STORAGE_PREFIX = "praxis_onboarding_v1";

export function onboardingStorageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function openOnboardingTour() {
  window.dispatchEvent(new Event(OPEN_ONBOARDING_EVENT));
}

const STEPS = [
  {
    route: "/",
    target: "command-center",
    eyebrow: "Start here",
    title: "See what needs attention",
    description: "Command Center shows the current review queue, compliance coverage, overdue work, and recent activity from this workspace.",
  },
  {
    route: "/documents",
    target: "regulation-upload",
    eyebrow: "Bring in source material",
    title: "Upload a regulation",
    description: "Open Regulations and upload the official PDF here. Processing extracts reviewable obligations while retaining the source text for review.",
  },
  {
    route: "/obligations",
    target: "obligations",
    eyebrow: "Human review gate",
    title: "Confirm what applies",
    description: "Open an obligation and compare it with the cited paragraph. Approve means the requirement is accepted as applicable. Work is created only after you generate rules and tasks from its regulation review.",
  },
  {
    route: "/tasks",
    target: "tasks",
    eyebrow: "Operational work",
    title: "Track assigned work",
    description: "Generated tasks are grouped by department. Owners work here, update status, and open the originating obligation whenever they need the regulatory context.",
  },
  {
    route: "/evidence",
    target: "evidence",
    eyebrow: "Proof of completion",
    title: "Collect evidence",
    description: "Evidence Center shows the artefacts required by generated rules, their collector, and whether a real file has been uploaded.",
  },
  {
    route: "/knowledge-graph",
    target: "compliance-map",
    eyebrow: "Traceability",
    title: "Follow the compliance chain",
    description: "Compliance Map connects each regulation to obligations, departments, rules, tasks, owners, evidence, and risk signals that actually exist in the workspace.",
  },
  {
    route: "/copilot",
    target: "copilot",
    eyebrow: "Ask with context",
    title: "Use Praxis Copilot",
    description: "Ask about the product or the current workspace. Regulatory answers cite the stored obligation records used, while product guidance stays free of unrelated citations.",
  },
] as const;

interface TargetPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingTour({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [target, setTarget] = useState<TargetPosition | null>(null);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  useEffect(() => {
    setOpen(localStorage.getItem(onboardingStorageKey(userId)) !== "done");
  }, [userId]);

  useEffect(() => {
    const restart = () => {
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_ONBOARDING_EVENT, restart);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, restart);
  }, []);

  useEffect(() => {
    if (!open || location.pathname === step.route) return;
    navigate(step.route);
  }, [location.pathname, navigate, open, step.route]);

  useLayoutEffect(() => {
    if (!open) return;
    setTarget(null);
    const updateTarget = () => {
      const element = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!element || element.offsetParent === null) {
        setTarget(null);
        return;
      }
      const rect = element.getBoundingClientRect();
      setTarget({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    const frame = window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (typeof element?.scrollIntoView === "function") {
        element.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      updateTarget();
    });
    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [location.pathname, open, step.target]);

  useEffect(() => {
    if (!open) return;
    primaryActionRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        localStorage.setItem(onboardingStorageKey(userId), "done");
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled)")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, stepIndex, userId]);

  const finish = () => {
    localStorage.setItem(onboardingStorageKey(userId), "done");
    setOpen(false);
  };

  if (!open) return null;

  const popoverWidth = 384;
  const popoverHeight = 340;
  const canAnchor = target !== null && window.innerWidth >= 1024;
  const placement = target && canAnchor
    ? target.left + target.width + popoverWidth + 32 < window.innerWidth
      ? "right"
      : target.left > popoverWidth + 32
        ? "left"
        : target.top + target.height + popoverHeight + 32 < window.innerHeight
          ? "below"
          : "above"
    : null;
  const popoverStyle = target && canAnchor ? {
    top: placement === "below"
      ? target.top + target.height + 16
      : placement === "above"
        ? Math.max(16, target.top - popoverHeight - 16)
        : Math.max(16, Math.min(target.top, window.innerHeight - popoverHeight - 16)),
    left: placement === "right"
      ? target.left + target.width + 16
      : placement === "left"
        ? target.left - popoverWidth - 16
        : Math.max(16, Math.min(target.left, window.innerWidth - popoverWidth - 16)),
    width: popoverWidth,
  } : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[100]" data-testid="onboarding-tour">
      {target ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-amber-600 ring-offset-4 ring-offset-background transition-[top,left,width,height] duration-200 motion-reduce:transition-none"
          style={{
            top: target.top - 4,
            left: target.left - 4,
            width: target.width + 8,
            height: target.height + 8,
            boxShadow: "0 0 0 9999px rgb(15 23 42 / 0.48)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-slate-950/50" />
      )}

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        className={canAnchor
          ? "fixed rounded-2xl border bg-card p-5 shadow-2xl"
          : "fixed inset-x-4 top-1/2 mx-auto max-h-[calc(100vh-2rem)] max-w-sm -translate-y-1/2 overflow-y-auto rounded-2xl border bg-card p-5 shadow-2xl"
        }
        style={popoverStyle}
      >
        {canAnchor && (
          <span
            aria-hidden="true"
            className={`absolute h-4 w-4 rotate-45 border bg-card ${
              placement === "right"
                ? "-left-2 top-8 border-b border-l border-r-0 border-t-0"
                : placement === "left"
                  ? "-right-2 top-8 border-r border-t border-b-0 border-l-0"
                  : placement === "below"
                    ? "-top-2 left-8 border-l border-t border-b-0 border-r-0"
                    : "-bottom-2 left-8 border-b border-r border-l-0 border-t-0"
            }`}
          />
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">{step.eyebrow}</div>
            <h2 id="onboarding-title" className="mt-2 text-lg font-semibold">{step.title}</h2>
          </div>
          <button
            type="button"
            aria-label="Skip guided tour"
            onClick={finish}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p id="onboarding-description" className="mt-3 text-sm leading-6 text-muted-foreground">{step.description}</p>

        <div className="mt-5 flex items-center gap-2">
          <span className="mr-auto text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {stepIndex + 1} of {STEPS.length}
          </span>
          {stepIndex > 0 && (
            <Button variant="outline" onClick={() => setStepIndex((current) => current - 1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          <Button ref={primaryActionRef} onClick={() => isLast ? finish() : setStepIndex((current) => current + 1)}>
            {isLast ? <><Check className="h-4 w-4" /> Done</> : <>Next <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

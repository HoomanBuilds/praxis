import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Layout + motion primitives, shaped to the reference's node tree:

     <section>            padding 134px 200px 80px, flex, items-start
       <div "content">    flex column, items-center, gap 48px, max-width 820px
         <div "Title">    flex column, items-center, gap 16px, width 100%
         …
--------------------------------------------------------------------------- */

/** One page section: the 200px side gutters and the 820px centred column. */
export function Section({
  id,
  children,
  className,
  pad = "default",
  wide = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  pad?: "default" | "hero" | "tight" | "cta";
  /** Card-heavy sections use the wider Corekit-style column. */
  wide?: boolean;
}) {
  const padding =
    pad === "hero"
      ? "pt-28 pb-[60px] lg:pt-[134px] lg:pb-20"
      : pad === "tight"
        ? "py-5 lg:py-10"
        : pad === "cta"
          ? "py-[60px] lg:py-28"
          : "pt-20 pb-[60px] lg:pt-[134px] lg:pb-20";

  return (
    <section
      id={id}
      className={cn(
        "flex w-full items-start justify-center px-5 sm:px-[30px]",
        wide ? "lg:px-10" : "lg:px-[200px]",
        padding,
        className,
      )}
    >
      <div className={cn("flex w-full flex-col items-center gap-12", wide ? "max-w-[1120px]" : "max-w-[820px]")}>
        {children}
      </div>
    </section>
  );
}

/** The centred eyebrow → headline → subhead block (gap 16px in the reference). */
export function TitleBlock({
  eyebrow,
  eyebrowIcon: Icon,
  title,
  sub,
  className,
}: {
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  title: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col items-center gap-4 text-center", className)}>
      {eyebrow ? (
        <Reveal>
          <span className="t-eyebrow inline-flex items-center gap-1.5">
            {Icon ? <Icon className="h-4 w-4" strokeWidth={2.2} /> : null}
            {eyebrow}
          </span>
        </Reveal>
      ) : null}
      <Reveal delay={80}>
        <h2 className="t-h2 mx-auto max-w-[660px] text-balance">{title}</h2>
      </Reveal>
      {sub ? (
        <Reveal delay={160}>
          <p className="t-body mx-auto max-w-[460px] text-balance">{sub}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

/** Corekit's coloured section label: 14px weight 600 with a matching icon. */
export function AccentEyebrow({
  icon: Icon,
  tone = "blue",
  children,
  className,
}: {
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber";
  children: ReactNode;
  className?: string;
}) {
  const color =
    tone === "green" ? "var(--accent-green)" : tone === "amber" ? "var(--accent-amber)" : "var(--accent-blue)";
  return (
    <span
      className={cn("t-eyebrow inline-flex items-center gap-2", className)}
      style={{ color }}
    >
      <Icon className="h-4 w-4" strokeWidth={2.2} />
      {children}
    </span>
  );
}

/* --- motion --------------------------------------------------------------- */

/** True when the visitor has asked the OS to minimise animation. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Adds `in-view` once the element scrolls into frame, then stops observing. */
export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "-60px", ...options },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [options]);
  return { ref, inView };
}

/** Fade-up-on-scroll wrapper. `delay` staggers siblings. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("reveal", inView && "in-view", className)}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Headline that rises word by word on mount. */
export function RisingWords({
  text,
  className,
  startDelay = 0,
  step = 55,
}: {
  text: string;
  className?: string;
  startDelay?: number;
  step?: number;
}) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden align-bottom">
          <span className="hero-word" style={{ ["--word-delay" as string]: `${startDelay + i * step}ms` }}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Counts from 0 to `to` the first time it scrolls into view (ease-out cubic). */
export function CountUp({
  to,
  duration = 1400,
  suffix = "",
  className,
}: {
  to: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const reduced = usePrefersReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setVal(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduced]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {val}
      {suffix}
    </span>
  );
}

/** Seamless infinite marquee — children are rendered twice back to back. */
export function Marquee({
  children,
  duration = 40,
  reverse = false,
  className,
}: {
  children: ReactNode;
  duration?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("marquee-mask w-full overflow-hidden", className)}>
      <div
        className={cn("marquee", reverse && "rtl")}
        style={{ ["--marquee-dur" as string]: `${duration}s` }}
      >
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}

/* --- buttons -------------------------------------------------------------- */

/**
 * The reference's two button variants: a black `Primary` and a white
 * `Secondary`, both radius 9px with 12px internal gap — not full pills.
 */
export function Button({
  children,
  to,
  variant = "primary",
  className,
  onClick,
}: {
  children: ReactNode;
  to?: string;
  variant?: "primary" | "secondary";
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={to}
      onClick={onClick}
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-[var(--r-btn)] px-3 py-2",
        "text-[14px] font-medium leading-[14px] tracking-[-0.02em] transition-colors duration-300",
        "[transition-timing-function:var(--ease)]",
        variant === "primary"
          ? "bg-[var(--ink)] text-white hover:bg-[#1a1a1a]"
          : "bg-[var(--btn-2)] text-[var(--ink)] hover:bg-[#e0e0e0]",
        className,
      )}
    >
      {children}
    </a>
  );
}

/**
 * Two-tone split pill from the reference's hero: a plain lead word, a light
 * inset segment, then a circular arrow.
 */
export function SplitPill({
  lead,
  children,
  to,
  className,
}: {
  lead: string;
  children: ReactNode;
  to: string;
  className?: string;
}) {
  return (
    <a
      href={to}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full bg-[var(--card)] p-1 pl-4 text-[14px] font-medium",
        "shadow-[var(--shadow-2)] transition-transform duration-300 [transition-timing-function:var(--ease)] hover:-translate-y-px",
        className,
      )}
    >
      <span className="text-[var(--ink)]">{lead}</span>
      <span className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-[var(--ink-2)]">{children}</span>
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--ink)]">
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
    </a>
  );
}

/** The "sample content" tag used anywhere the copy is illustrative, not real. */
export function IllustrativeTag({ className, label = "Sample" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "mono inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--ink-4)]",
        "bg-[var(--card)] px-2 py-[3px] text-[10px] uppercase tracking-[0.08em] text-[var(--ink-3)]",
        className,
      )}
    >
      {label}
    </span>
  );
}

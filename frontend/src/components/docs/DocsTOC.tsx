import { useEffect, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import type { TocHeading } from "./docs-utils";

export function DocsTOC({
  headings,
  containerRef,
}: {
  headings: TocHeading[];
  containerRef: RefObject<HTMLElement>;
}) {
  const [active, setActive] = useState<string | undefined>(headings[0]?.id);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const containerTop = container.getBoundingClientRect().top;
        const marker = container.scrollTop + 160;
        let current: string | undefined;
        for (const h of headings) {
          const el = container.querySelector<HTMLElement>(`[id="${h.id}"]`);
          if (el) {
            const top = el.getBoundingClientRect().top - containerTop + container.scrollTop;
            if (top <= marker) current = h.id;
          }
        }
        setActive(current);
      });
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener("scroll", onScroll);
    };
  }, [headings, containerRef]);

  if (headings.length === 0) return null;

  return (
    <nav className="docs-font pb-8" style={{ paddingInlineEnd: "var(--s2)" }}>
      <ul className="relative" style={{ paddingInlineStart: "var(--s3)", listStyle: "none", margin: 0 }}>
        <li
          className="absolute inset-y-0 rounded-full"
          style={{
            insetInlineStart: 0,
            width: "2px",
            background: "var(--line)",
          }}
        />
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                containerRef.current
                  ?.querySelector<HTMLElement>(`[id="${h.id}"]`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
                history.replaceState(null, "", `#${h.id}`);
              }}
              className={cn(
                "relative block py-1 text-[var(--t-toc)] leading-[1.5] text-[var(--ink-3)] no-underline transition-colors duration-120 hover:text-[var(--ink)]",
                h.level === 3 && "pl-3",
                active === h.id ? "text-[var(--ink)]" : "",
              )}
            >
              {active === h.id && (
                <span
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    insetInlineStart: "-12px",
                    width: "2px",
                    background: "var(--ink)",
                  }}
                />
              )}
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

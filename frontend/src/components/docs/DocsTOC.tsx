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
    <nav className="sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto pb-8 pl-6">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">On this page</p>
      <ul className="space-y-1 border-l border-gray-100">
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
                "-ml-px block border-l pl-3 text-[13px] leading-5 text-gray-500 hover:text-gray-900 transition-colors",
                h.level === 3 && "pl-6",
                active === h.id ? "border-gray-900 text-gray-900 font-medium" : "border-gray-100",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

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
    <nav className="docs-font px-6 pb-10">
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#6B7280]">On this page</p>
      <ul className="space-y-3 border-l border-[#E5E7EB]">
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
                "-ml-px block border-l pl-4 text-[14px] font-normal leading-5 text-[#6B7280] transition-colors duration-150 hover:text-[#111827]",
                h.level === 3 && "pl-8",
                active === h.id ? "border-[#111827] text-[#111827]" : "border-[#E5E7EB]",
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

import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import type { DocPage } from "@/docs/types";
import { DOCS_NAV, findPrevNext } from "@/docs";
import { DocBlocks } from "./DocBlocks";
import { CopyButton } from "./CopyButton";
import { pageToText, readingMinutes } from "./docs-utils";

export function DocContent({ page }: { page: DocPage }) {
  const section = DOCS_NAV.find((s) => s.pages.some((p) => p.slug === page.slug));
  const { prev, next } = findPrevNext(page.slug);
  const minutes = readingMinutes(page);

  return (
    <article>
      <nav className="mb-3 text-[var(--t-sm)] tracking-[var(--ls-sm)] text-[var(--ink-3)]" aria-label="Breadcrumb">
        <Link to="/docs" className="transition-colors duration-120 hover:text-[var(--ink)]">
          Documentation
        </Link>
        {section && (
          <>
            <span className="mx-1.5 text-[var(--ink-4)]">/</span>
            <Link to={`/docs/${section.pages[0].slug}`} className="transition-colors duration-120 hover:text-[var(--ink)]">
              {section.title}
            </Link>
          </>
        )}
        <span className="mx-1.5 text-[var(--ink-4)]">/</span>
        <span className="text-[var(--ink)]">{page.title}</span>
      </nav>

      <h1 style={{ fontFamily: "var(--display-font)" }} className="text-[var(--t-h1)] leading-[var(--l-h1)] font-semibold tracking-[var(--ls-h1)] text-[var(--ink)]">{page.title}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[var(--t-sm)] tracking-[var(--ls-sm)] text-[var(--ink-3)]">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {minutes} min read
        </span>
        <span>
          Updated <span className="text-[var(--ink-2)]">{page.updated}</span>
        </span>
        <span className="ml-auto">
          <CopyButton text={pageToText(page)} />
        </span>
      </div>

      <p className="mt-8 text-[var(--t-lead)] leading-[var(--l-lead)] tracking-[var(--ls-lead)] text-[var(--ink-2)]">{page.description}</p>

      <div>
        <DocBlocks blocks={page.sections} />
      </div>

      {(prev || next) && (
        <nav className="mt-14 grid gap-3 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
          {prev ? (
            <Link
              to={`/docs/${prev.slug}`}
              className="group flex flex-col gap-0.5 rounded-[10px] border border-[var(--line)] px-4 py-3 transition-colors duration-140 hover:border-[var(--line-2)]"
            >
              <span className="text-[12px] text-[var(--ink-3)]">
                <ArrowLeft className="mr-1 inline h-3 w-3" /> Previous
              </span>
              <span className="text-[var(--t-sm)] font-medium tracking-[var(--ls-sm)] text-[var(--ink)] transition-colors duration-120 group-hover:text-[var(--ink-2)]">
                {prev.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={`/docs/${next.slug}`}
              className="group flex flex-col items-end gap-0.5 rounded-[10px] border border-[var(--line)] px-4 py-3 text-right transition-colors duration-140 hover:border-[var(--line-2)]"
            >
              <span className="text-[12px] text-[var(--ink-3)]">
                Next <ArrowRight className="ml-1 inline h-3 w-3" />
              </span>
              <span className="text-[var(--t-sm)] font-medium tracking-[var(--ls-sm)] text-[var(--ink)] transition-colors duration-120 group-hover:text-[var(--ink-2)]">
                {next.title}
              </span>
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}

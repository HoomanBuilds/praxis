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
      <nav className="mb-7 text-[14px] text-[#6B7280]" aria-label="Breadcrumb">
        <Link to="/docs" className="transition-colors duration-150 hover:text-[#111827]">
          Documentation
        </Link>
        {section && (
          <>
            <span className="mx-2 text-[#D1D5DB]">/</span>
            <Link to={`/docs/${section.pages[0].slug}`} className="transition-colors duration-150 hover:text-[#111827]">
              {section.title}
            </Link>
          </>
        )}
        <span className="mx-2 text-[#D1D5DB]">/</span>
        <span className="text-[#111827]">{page.title}</span>
      </nav>

      <h1 className="text-[48px] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#111827]">{page.title}</h1>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-[#6B7280]">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {minutes} min read
        </span>
        <span>
          Last updated <span className="text-[#111827]">{page.updated}</span>
        </span>
        <span className="ml-auto">
          <CopyButton text={pageToText(page)} />
        </span>
      </div>

      <p className="mt-9 text-[17px] leading-[1.8] text-[#4B5563]">{page.description}</p>

      <div>
        <DocBlocks blocks={page.sections} />
      </div>

      {(prev || next) && (
        <nav className="mt-20 grid gap-4 border-t border-[#E5E7EB] pt-10 sm:grid-cols-2">
          {prev ? (
            <Link
              to={`/docs/${prev.slug}`}
              className="group flex h-[86px] items-center rounded-[16px] border border-[#E5E7EB] px-6 transition-colors duration-150 hover:bg-[#F9FAFB]"
            >
              <div className="text-left">
                <span className="flex items-center gap-1 text-[13px] text-[#9CA3AF]">
                  <ArrowLeft className="h-3.5 w-3.5" /> Previous
                </span>
                <span className="mt-1 block text-[15px] font-medium text-[#111827] transition-colors duration-150 group-hover:text-[#6B7280]">
                  {prev.title}
                </span>
              </div>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={`/docs/${next.slug}`}
              className="group flex h-[86px] items-center justify-end rounded-[16px] border border-[#E5E7EB] px-6 transition-colors duration-150 hover:bg-[#F9FAFB]"
            >
              <div className="text-right">
                <span className="flex items-center justify-end gap-1 text-[13px] text-[#9CA3AF]">
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </span>
                <span className="mt-1 block text-[15px] font-medium text-[#111827] transition-colors duration-150 group-hover:text-[#6B7280]">
                  {next.title}
                </span>
              </div>
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}

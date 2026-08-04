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
      <nav className="mb-4 text-xs text-gray-400" aria-label="Breadcrumb">
        <Link to="/docs" className="hover:text-gray-600">
          Documentation
        </Link>
        {section && (
          <>
            <span className="mx-1.5">/</span>
            <Link to={`/docs/${section.pages[0].slug}`} className="hover:text-gray-600">
              {section.title}
            </Link>
          </>
        )}
        <span className="mx-1.5">/</span>
        <span className="text-gray-600">{page.title}</span>
      </nav>

      <header className="border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{page.title}</h1>
        <p className="mt-2 text-[15px] leading-6 text-gray-500">{page.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            {minutes} min read
          </span>
          <span className="text-xs text-gray-500">
            Last updated <span className="text-gray-700">{page.updated}</span>
          </span>
          <span className="ml-auto">
            <CopyButton text={pageToText(page)} />
          </span>
        </div>
      </header>

      <div className="mt-6">
        <DocBlocks blocks={page.sections} />
      </div>

      {(prev || next) && (
        <nav className="mt-12 grid gap-3 border-t border-gray-100 pt-6 sm:grid-cols-2">
          {prev ? (
            <Link
              to={`/docs/${prev.slug}`}
              className="group rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <ArrowLeft className="h-3 w-3" /> Previous
              </span>
              <span className="mt-1 block text-sm font-medium text-gray-900 group-hover:text-gray-700">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={`/docs/${next.slug}`}
              className="group rounded-lg border border-gray-200 p-4 text-right transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                Next <ArrowRight className="h-3 w-3" />
              </span>
              <span className="mt-1 block text-sm font-medium text-gray-900 group-hover:text-gray-700">{next.title}</span>
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}

import { useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { getDocPage } from "@/docs";
import { DocsShell } from "@/components/docs/DocsShell";
import { DocsTOC } from "@/components/docs/DocsTOC";
import { DocContent } from "@/components/docs/DocContent";
import { getHeadings } from "@/components/docs/docs-utils";

export default function DocsPage() {
  const { slug } = useParams();
  const { hash, pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  const page = slug ? getDocPage(slug) : undefined;

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    if (!hash || !page) return;
    const id = decodeURIComponent(hash.slice(1));
    requestAnimationFrame(() => {
      mainRef.current?.querySelector<HTMLElement>(`[id="${id}"]`)?.scrollIntoView({ block: "start" });
    });
  }, [hash, page]);

  if (!page) {
    return (
      <DocsShell mainRef={mainRef}>
        <div className="flex flex-col items-center py-24 text-center">
          <FileQuestion className="h-10 w-10 text-gray-300" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            The page <span className="font-medium text-gray-700">{slug}</span> does not exist in the documentation.
          </p>
        </div>
      </DocsShell>
    );
  }

  const headings = getHeadings(page);

  return (
    <DocsShell
      currentSlug={page.slug}
      mainRef={mainRef}
      toc={<DocsTOC headings={headings} containerRef={mainRef} />}
    >
      <DocContent page={page} />
    </DocsShell>
  );
}

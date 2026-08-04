import type { DocPage, DocsNavSection } from "./types";
import { DOCS_NAV, ALL_NAV_PAGES } from "./sidebar";
import { pages as gettingStarted } from "./pages/getting-started";
import { pages as coreConcepts } from "./pages/core-concepts";
import { pages as complianceWorkflow } from "./pages/compliance-workflow";
import { pages as modules } from "./pages/modules";
import { pages as administration } from "./pages/administration";
import { pages as automation } from "./pages/automation";
import { pages as integrations } from "./pages/integrations";
import { pages as developers } from "./pages/developers";
import { pages as deployment } from "./pages/deployment";
import { pages as security } from "./pages/security";
import { pages as reference } from "./pages/reference";
import { pages as releaseNotes } from "./pages/release-notes";

export const DOC_PAGES: DocPage[] = [
  ...gettingStarted,
  ...coreConcepts,
  ...complianceWorkflow,
  ...modules,
  ...administration,
  ...automation,
  ...integrations,
  ...developers,
  ...deployment,
  ...security,
  ...reference,
  ...releaseNotes,
];

const bySlug = new Map(DOC_PAGES.map((page) => [page.slug, page]));

export function getDocPage(slug: string): DocPage | undefined {
  return bySlug.get(slug);
}

export function getNav(): DocsNavSection[] {
  return DOCS_NAV;
}

export function findSection(slug: string): DocsNavSection | undefined {
  return DOCS_NAV.find((s) => s.pages.some((p) => p.slug === slug));
}

/** Prev/next navigation from sidebar order, skipping a page linked from two sections. */
export function findPrevNext(slug: string): { prev?: DocPage; next?: DocPage } {
  const idx = ALL_NAV_PAGES.findIndex((p) => p.slug === slug);
  if (idx === -1) return {};
  let prevSlug: string | undefined;
  let nextSlug: string | undefined;
  for (let i = idx - 1; i >= 0; i--) {
    if (ALL_NAV_PAGES[i].slug !== slug) {
      prevSlug = ALL_NAV_PAGES[i].slug;
      break;
    }
  }
  for (let i = idx + 1; i < ALL_NAV_PAGES.length; i++) {
    if (ALL_NAV_PAGES[i].slug !== slug) {
      nextSlug = ALL_NAV_PAGES[i].slug;
      break;
    }
  }
  return { prev: prevSlug ? bySlug.get(prevSlug) : undefined, next: nextSlug ? bySlug.get(nextSlug) : undefined };
}

export { DOCS_NAV };

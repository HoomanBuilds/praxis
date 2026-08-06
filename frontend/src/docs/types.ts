/** Content model for the PRAXIS product documentation site. */
export type DocBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; text: string; lang?: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "callout"; variant: "note" | "tip" | "warning" | "danger"; title: string; text: string };

export interface DocPage {
  /** URL slug, stable and unique. */
  slug: string;
  title: string;
  /** One-sentence summary shown under the title and used in search. */
  description: string;
  /** Display date string for "Last updated". */
  updated: string;
  sections: DocBlock[];
}

export interface DocsNavSection {
  id: string;
  title: string;
  pages: { slug: string; title: string }[];
}

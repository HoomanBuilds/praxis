import type { DocPage } from "@/docs/types";

/** Stable anchor id for a heading — matches what DocBlocks renders. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export function getHeadings(page: DocPage): TocHeading[] {
  return page.sections
    .filter((b) => b.type === "h2" || b.type === "h3")
    .map((b) => ({ id: headingId(b.text), text: b.text, level: b.type === "h2" ? 2 : 3 }));
}

export function readingMinutes(page: DocPage): number {
  const words = page.sections.reduce((n, b) => {
    switch (b.type) {
      case "p":
      case "h2":
      case "h3":
        return n + b.text.split(/\s+/).length;
      case "ul":
      case "ol":
        return n + b.items.join(" ").split(/\s+/).length;
      case "code":
        return n + b.text.split(/\s+/).length;
      case "table":
        return n + b.rows.flat().join(" ").split(/\s+/).length;
      case "callout":
        return n + (b.title + " " + b.text).split(/\s+/).length;
    }
  }, 0);
  return Math.max(1, Math.round(words / 180));
}

/** Plain-text rendering of a page, used by the "Copy page" action. */
export function pageToText(page: DocPage): string {
  const lines: string[] = [];
  lines.push(page.title);
  lines.push("");
  lines.push(page.description);
  lines.push("");
  for (const b of page.sections) {
    switch (b.type) {
      case "h2":
        lines.push("", b.text.toUpperCase(), "");
        break;
      case "h3":
        lines.push("", b.text, "");
        break;
      case "p":
        lines.push(b.text);
        break;
      case "ul":
        b.items.forEach((i) => lines.push(`- ${i}`));
        break;
      case "ol":
        b.items.forEach((i, idx) => lines.push(`${idx + 1}. ${i}`));
        break;
      case "code":
        lines.push("", "```", b.text, "```");
        break;
      case "table": {
        lines.push("");
        lines.push(b.headers.join("  |  "));
        lines.push(b.headers.map(() => "---").join("  |  "));
        b.rows.forEach((r) => lines.push(r.join("  |  ")));
        break;
      }
      case "callout":
        lines.push(`[${b.title}] ${b.text}`);
        break;
    }
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

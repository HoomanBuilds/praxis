/** Compact authoring helpers for documentation pages. */
import type { DocBlock } from "./types";

export const h2 = (text: string): DocBlock => ({ type: "h2", text });
export const h3 = (text: string): DocBlock => ({ type: "h3", text });
export const p = (text: string): DocBlock => ({ type: "p", text });
export const ul = (items: string[]): DocBlock => ({ type: "ul", items });
export const ol = (items: string[]): DocBlock => ({ type: "ol", items });
export const code = (text: string, lang = "bash"): DocBlock => ({ type: "code", text, lang });
export const table = (headers: string[], rows: string[][]): DocBlock => ({ type: "table", headers, rows });
export const note = (title: string, text: string): DocBlock => ({ type: "callout", variant: "note", title, text });
export const tip = (title: string, text: string): DocBlock => ({ type: "callout", variant: "tip", title, text });
export const warning = (title: string, text: string): DocBlock => ({ type: "callout", variant: "warning", title, text });

export const UPDATED = "August 4, 2026";

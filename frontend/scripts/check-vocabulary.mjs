#!/usr/bin/env node
/**
 * Anti-drift guard for user-facing vocabulary.
 *
 * PRAXIS is used by compliance officers, auditors and executives. Implementation
 * vocabulary (LLM, regex, parser, embedding, chunk, funnel, …) must not reach the screen.
 * The vocabulary module is the ONE place those words may appear.
 *
 * This scans string literals, template chunks and string-valued JSX attributes — not
 * identifiers or comments — because that is where copy lives and, specifically, because
 * `title=`/`placeholder=` attributes are where this class of work has already regressed.
 *
 * `vocabulary-allowlist.json` records the violations that existed when the guard landed,
 * so it starts green and ratchets: new violations fail immediately, and each cleanup
 * phase deletes entries. It is a burndown list, not a permanent exemption.
 *
 * Usage:  node scripts/check-vocabulary.mjs [--update-allowlist]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");
const ALLOWLIST_PATH = join(ROOT, "scripts", "vocabulary-allowlist.json");

/** Files permitted to name the internals — the dictionaries themselves. */
const EXEMPT_PATHS = [
  join("src", "lib", "vocab") + sep,
  join("src", "lib", "types.ts"),
  join("src", "vite-env.d.ts"),
];

const BANNED = [
  /\bLLMs?\b/i,
  /\bOllama\b/i,
  /\bllama[\d.]/i,
  /\blanguage model\b/i,
  /\blocal model\b/i,
  /\bregexe?s?\b/i,
  /\bdeterministic\b/i,
  /\bembeddings?\b/i,
  /\bchunks?\b/i,
  /\bcorpus\b/i,
  /\bparsers?\b/i,
  /\bpipelines?\b/i,
  /\bfunnels?\b/i,
  /\bcandidates?\b/i,
  /\bagent fleet\b/i,
  /\bknowledge graph\b/i,
  /\bsemantic\b/i,
  /\bRAG\b/,
  /\bvector\b/i,
  /\bprovenance\b/i,
];

/** Attributes whose string values are machine-facing, not copy. */
const SKIP_ATTRS = new Set(["className", "class", "to", "href", "src", "key", "queryKey", "id", "name", "type", "variant", "style"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full);
  }
  return out;
}

/** Strip comments and imports so identifiers/notes never trigger the scan. */
function stripNonCopy(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m) => " ".repeat(m.length))
    .replace(/^\s*import[\s\S]*?from\s+["'][^"']+["'];?/gm, (m) => " ".repeat(m.length));
}

/**
 * Identifier-shaped strings are code, not copy: vocabulary keys ("pipeline.sections"),
 * backend enum values ("deterministic"), object keys ("llm"). Real copy has spaces or
 * capitals. Skipping these is what keeps the guard usable rather than disabled.
 */
const IDENTIFIER_LIKE = /^[a-z0-9_.\-/]+$/;

/** Collect candidate copy strings with their line numbers. */
function copyStrings(src) {
  const found = [];
  const push = (raw, index) => {
    // `${…}` holds expressions, not copy — blank them before matching.
    const text = raw.replace(/\$\{[^}]*\}/g, " ");
    if (!text.trim() || IDENTIFIER_LIKE.test(text.trim())) return;
    found.push({ text, line: src.slice(0, index).split("\n").length });
  };
  // Quoted string literals and template literals.
  const literal = /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g;
  let m;
  while ((m = literal.exec(src))) {
    const before = src.slice(Math.max(0, m.index - 60), m.index);
    const attr = before.match(/([A-Za-z_][\w]*)\s*=\s*\{?\s*$/);
    if (attr && SKIP_ATTRS.has(attr[1])) continue;
    push(m[2], m.index);
  }
  // JSX text nodes: >…< with no braces or tags. This misses copy that trails an
  // expression ("{count} LLM"), so the tail pattern below picks those up separately.
  const jsxText = />([^<>{}]+)</g;
  while ((m = jsxText.exec(src))) push(m[1], m.index);
  // Copy that trails an expression and a closing tag: `{expr} words</tag>`.
  // Anchored to `</` (a real closing tag), so `=> … <` in code never triggers.
  const jsxTail = /\}([^<>{}]*)<\//g;
  while ((m = jsxTail.exec(src))) push(m[1], m.index);
  return found;
}

const allowlist = new Set(
  JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8").toString() || "[]").map((e) => `${e.file}:${e.term}`),
);

const violations = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  if (EXEMPT_PATHS.some((p) => rel.startsWith(p))) continue;
  const src = stripNonCopy(readFileSync(file, "utf8"));
  for (const { text, line } of copyStrings(src)) {
    for (const rx of BANNED) {
      const hit = text.match(rx);
      if (!hit) continue;
      const term = hit[0].toLowerCase();
      // Allowlisted per file+term, so a fixed file cannot silently regress on a
      // different line with the same word.
      if (allowlist.has(`${rel}:${term}`)) continue;
      violations.push({ file: rel, line, term, text: text.trim().slice(0, 90) });
    }
  }
}

if (process.argv.includes("--update-allowlist")) {
  const seen = new Map();
  for (const v of violations) seen.set(`${v.file}:${v.term}`, { file: v.file, term: v.term });
  const merged = [...allowlist].map((k) => {
    const i = k.lastIndexOf(":");
    return { file: k.slice(0, i), term: k.slice(i + 1) };
  });
  for (const v of seen.values()) merged.push(v);
  merged.sort((a, b) => a.file.localeCompare(b.file) || a.term.localeCompare(b.term));
  writeFileSync(ALLOWLIST_PATH, JSON.stringify(merged, null, 2) + "\n");
  console.log(`vocabulary allowlist written: ${merged.length} entries`);
  process.exit(0);
}

if (violations.length) {
  console.error(`\n✖ ${violations.length} vocabulary violation(s) — implementation jargon in user-facing copy:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  "${v.term}"  →  ${v.text}`);
  }
  console.error(`\nUse a term from src/lib/vocab/terms.ts instead. If this really is`);
  console.error(`engineering-only copy, add an { business, engineering } pair so business`);
  console.error(`mode never shows it.\n`);
  process.exit(1);
}

console.log(`✓ vocabulary clean (${allowlist.size} allowlisted violation(s) remaining to burn down)`);

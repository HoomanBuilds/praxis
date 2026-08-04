#!/usr/bin/env node
/**
 * Keeps the frontend's audit-action dictionary honest against the backend.
 *
 * Drift here is silent and goes both ways. Before this guard existed the dictionary had
 * 6 keys for actions the backend never emitted, and was missing 8 that it did — so real
 * audit rows rendered as raw `snake_case` codes while dead entries looked like coverage.
 *
 * The backend is the source of truth: every `action="..."` passed to `record_audit` must
 * have a display label, and no label may exist for an action that is never written.
 *
 * Usage:  node scripts/check-enum-coverage.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const BACKEND = join(FRONTEND, "..", "backend");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "__pycache__" || entry === "tests") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".py")) out.push(full);
  }
  return out;
}

// Collect every dotted literal on an `action=` assignment, reading to end of line so
// inline ternaries (`action="a.b" if cond else "a.c"`) contribute BOTH branches.
const backendActions = new Set();
for (const file of walk(BACKEND)) {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!/\baction\s*=/.test(line)) continue;
    const rhs = line.slice(line.search(/\baction\s*=/));
    for (const lit of rhs.matchAll(/["']([a-z_]+\.[a-z_]+)["']/g)) backendActions.add(lit[1]);
  }
}

const vocabSrc = readFileSync(join(FRONTEND, "src", "lib", "vocab", "backend.ts"), "utf8");
const actionsBlock = vocabSrc.slice(
  vocabSrc.indexOf("const AUDIT_ACTIONS"),
  vocabSrc.indexOf("const RESOURCE_TYPES"),
);
const frontendActions = new Set([...actionsBlock.matchAll(/"([a-z_]+\.[a-z_]+)":/g)].map((m) => m[1]));

const missing = [...backendActions].filter((a) => !frontendActions.has(a)).sort();
const phantom = [...frontendActions].filter((a) => !backendActions.has(a)).sort();

if (!backendActions.size) {
  console.error("✖ found no audit actions in backend/ — the scan pattern is probably stale");
  process.exit(1);
}

if (missing.length || phantom.length) {
  if (missing.length) {
    console.error(`\n✖ ${missing.length} audit action(s) emitted by the backend with no display label:`);
    for (const a of missing) console.error(`    ${a}`);
    console.error("  → add to AUDIT_ACTIONS in src/lib/vocab/backend.ts");
  }
  if (phantom.length) {
    console.error(`\n✖ ${phantom.length} label(s) for action(s) the backend never emits:`);
    for (const a of phantom) console.error(`    ${a}`);
    console.error("  → remove from AUDIT_ACTIONS (dead entries look like coverage)");
  }
  console.error("");
  process.exit(1);
}

console.log(`✓ audit actions in sync (${backendActions.size} actions, all labelled)`);

import { useMemo } from "react";
import { useUIMode } from "@/context/UIModeContext";
import { term, type TermKey } from "@/lib/vocab/terms";
import { enumLabel, type EnumNamespace } from "@/lib/vocab/backend";

/**
 * The single way UI copy reaches the screen.
 *
 * `t(key)` — static copy from the closed `TermKey` union.
 * `e(ns, raw)` — a backend value (audit action, status, node type) mapped for display.
 *
 * A hook rather than a `<Term>` component because most jargon in this codebase lives
 * inside string-building expressions and `title=` / `placeholder=` attributes, which a
 * JSX-only API cannot reach — and attributes are exactly where this class of work has
 * already regressed once.
 */
export function useVocab() {
  const { mode, isBusiness } = useUIMode();
  return useMemo(
    () => ({
      t: (key: TermKey) => term(key, mode),
      e: (ns: EnumNamespace, raw: string) => enumLabel(ns, raw, mode),
      mode,
      isBusiness,
    }),
    [mode, isBusiness],
  );
}

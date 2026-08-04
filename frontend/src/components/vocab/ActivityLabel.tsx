/**
 * Renders a backend audit `action` as a human sentence.
 *
 * Shared by the Command Center feed and the Audit Trail, which previously rendered the
 * same events through two unrelated code paths (one mapped, one raw `titleCase`).
 *
 * The raw code stays reachable via `title=` — the Audit Trail is an evidence artifact,
 * so a compliance officer must always be able to recover the exact stored value.
 */
import { useVocab } from "@/hooks/useVocab";

export function useActivityLabel() {
  const { e } = useVocab();
  return (action: string) => e("audit.action", action);
}

/** Renders an audit `actor` for display — people title-cased, pipeline actors branded. */
export function useActorLabel() {
  const { e } = useVocab();
  return (actor: string) => e("audit.actor", actor);
}

export function ActivityLabel({ action }: { action: string }) {
  const label = useActivityLabel()(action);
  return <span title={action}>{label}</span>;
}

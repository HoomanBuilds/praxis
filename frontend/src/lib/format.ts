// Backend timestamps come in two shapes: naive UTC ("…T03:28:04") from SQLAlchemy
// columns, and offset-aware ("…T03:28:04+00:00") from datetime.now(timezone.utc).
// Only the naive form needs a "Z" appended — adding one to an offset-aware string
// produces an invalid date (which surfaced as "NaNd ago").
function asUtc(iso: string): Date {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso);
  return new Date(hasZone ? iso : iso + "Z");
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const t = asUtc(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function dayKey(iso: string | null): string {
  if (!iso) return "";
  const d = asUtc(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

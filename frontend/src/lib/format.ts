export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso.endsWith("Z") ? iso : iso + "Z").getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function dayKey(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso.endsWith("Z") ? iso : iso + "Z").toISOString().slice(0, 10);
}

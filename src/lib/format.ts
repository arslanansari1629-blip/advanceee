export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n.toLocaleString("en-US");
}

export function pct(n: number, digits = 1) {
  return `${Number(n.toFixed(digits))}%`;
}

export function initials(name: string) {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/**
 * Timestamps on the product are epoch milliseconds. Everything below renders
 * them in UTC so the server HTML and the browser agree (no hydration drift).
 */
export function diffMs(ts: number, now = Date.now()) {
  return Math.max(0, now - ts);
}

export function timeAgo(ts: number | null | undefined, now = Date.now()) {
  if (!ts) return "—";
  const diff = diffMs(ts, now);
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

/** Compact duration, e.g. "3d 4h" / "12m". */
export function since(ts: number | null | undefined, now = Date.now()) {
  if (!ts) return "—";
  const mins = Math.floor(diffMs(ts, now) / 60000);
  if (mins < 1) return "moments";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function dateAt(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function stampUTC(ts: number | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
  return `${month} ${day} · ${d.toISOString().slice(11, 16)}Z`;
}

export function clockUTC(ts: number) {
  return new Date(ts).toISOString().slice(11, 19);
}

/** Split a requirements string ("python-telegram-bot\nrequests") into pinned packages. */
export function splitRequirements(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"));
}

export function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 10)}…` : id;
}

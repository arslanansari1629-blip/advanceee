/**
 * Live connection to the BotForge Cloud product.
 *
 * The console is a *remote operator panel*: it never invents data. Every read
 * hits the product's operator API (`/api/admin/data`) using an operator session
 * cookie obtained by logging in with the credentials the operator typed.
 *
 * The product URL comes from BOTFORGE_API_URL (defaults to the public site).
 * No product password is ever stored in this deployment.
 */

const RAW_BASE = process.env.BOTFORGE_API_URL || "https://botforge-cloud.vercel.app";

export const PRODUCT_BASE = RAW_BASE.replace(/\/+$/, "");

export const OPERATOR_COOKIE = "bf_operator";

export function isProductConfigured(): boolean {
  return Boolean(PRODUCT_BASE);
}

function cookieFrom(response: Response): string | null {
  const raw = response.headers.get("set-cookie") ?? "";
  if (!raw) return null;
  const first = raw.split(/,(?=\s*[a-zA-Z0-9_-]+=)/)[0];
  const pair = first.split(";")[0]?.trim() ?? "";
  const eq = pair.indexOf("=");
  if (eq < 0) return null;
  const value = pair.slice(eq + 1);
  return value || null;
}

/** Exchange operator credentials for a product operator session token. */
export async function operatorLogin(
  username: string,
  password: string,
): Promise<{ ok: true; token: string } | { ok: false; reason: "invalid" | "unreachable" | "not_configured"; detail?: string }> {
  if (!isProductConfigured()) return { ok: false, reason: "not_configured" };
  try {
    const res = await fetch(`${PRODUCT_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) return { ok: false, reason: "invalid" };
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, reason: "unreachable", detail: `product answered ${res.status} ${detail.slice(0, 120)}` };
    }

    const token = cookieFrom(res);
    if (!token) {
      return { ok: false, reason: "unreachable", detail: "product accepted the login but did not return a session cookie" };
    }
    return { ok: true, token };
  } catch (error) {
    return { ok: false, reason: "unreachable", detail: (error as Error).message };
  }
}

export type ProductResult<T> =
  | { ok: true; data: T; latencyMs: number }
  | { ok: false; reason: "unauthorized" | "unreachable"; detail?: string };

async function operatorFetch<T>(path: string, token: string, init?: RequestInit): Promise<ProductResult<T>> {
  const started = Date.now();
  try {
    const res = await fetch(`${PRODUCT_BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        cookie: `${OPERATOR_COOKIE}=${token}`,
      },
      cache: "no-store",
    });
    const latencyMs = Date.now() - started;

    if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized" };
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, reason: "unreachable", detail: `product answered ${res.status} ${detail.slice(0, 160)}` };
    }
    return { ok: true, data: (await res.json()) as T, latencyMs };
  } catch (error) {
    return { ok: false, reason: "unreachable", detail: (error as Error).message };
  }
}

/**
 * Server-side operator credentials for this deployment.
 *
 * The console can either borrow the session the human created, or — when the
 * deployment is configured with the product's operator credentials — mint its
 * own `bf_operator` token. Both produce the same read-only operator access.
 */
export function operatorCredentials() {
  const user = process.env.BOTFORGE_OPERATOR_USERNAME || process.env.ADMIN_USERNAME || "";
  const password = process.env.BOTFORGE_OPERATOR_PASSWORD || process.env.ADMIN_PASSWORD || "";
  return { user, password, configured: Boolean(user && password) };
}

/** Cached service token (the product operator session lasts 12h). */
let serviceToken: { token: string; expiresAt: number } | null = null;

export async function getServiceToken(): Promise<string | null> {
  const creds = operatorCredentials();
  if (!creds.configured || !isProductConfigured()) return null;
  if (serviceToken && serviceToken.expiresAt > Date.now()) return serviceToken.token;

  const result = await operatorLogin(creds.user, creds.password);
  if (!result.ok) {
    serviceToken = null;
    return null;
  }
  serviceToken = { token: result.token, expiresAt: Date.now() + 11 * 60 * 60 * 1000 };
  return result.token;
}

export type OperatorProbe = "accepted" | "rejected" | "unreachable" | "not_configured";

/** Does this deployment's operator credential pair work on the product? */
export async function probeOperatorLogin(): Promise<OperatorProbe> {
  if (!isProductConfigured()) return "not_configured";
  const creds = operatorCredentials();
  if (!creds.configured) return "not_configured";
  if (serviceToken && serviceToken.expiresAt > Date.now()) return "accepted";
  const result = await operatorLogin(creds.user, creds.password);
  if (result.ok) {
    serviceToken = { token: result.token, expiresAt: Date.now() + 11 * 60 * 60 * 1000 };
    return "accepted";
  }
  return result.reason === "invalid" ? "rejected" : "unreachable";
}

/* ---------------------------------------------------------------- shape */

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const bool = (v: unknown, fallback = false) => (typeof v === "boolean" ? v : fallback);

/**
 * Accepts the product payload and returns it in the shape the console renders.
 *
 * Nothing is invented: missing counters are *derived* from the rows the product
 * did send, and anything genuinely absent becomes "unknown"/0 rather than a
 * guess. A payload without bot/user rows is rejected so the console can show a
 * real error instead of an empty-looking lie.
 */
export function normaliseAdminData(raw: unknown): { data: import("./types").AdminData } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "the product answered with something that is not an object" };
  const r = raw as Record<string, unknown>;
  const keys = Object.keys(r);
  if (!Array.isArray(r.bots)) return { error: `payload has no bots[] array (keys: ${keys.join(", ") || "none"})` };
  if (!Array.isArray(r.users)) return { error: `payload has no users[] array (keys: ${keys.join(", ") || "none"})` };

  const bots = (r.bots as unknown[]).map((item) => {
    const b = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const statsRaw = (b.stats && typeof b.stats === "object" ? b.stats : {}) as Record<string, unknown>;
    return {
      id: str(b.id),
      name: str(b.name) || str(b.id) || "unnamed bot",
      status: str(b.status) || "unknown",
      username: b.username ? str(b.username) : null,
      framework: str(b.framework),
      entry: str(b.entry),
      requirements: str(b.requirements),
      restartCount: num(b.restartCount),
      autoRestart: bool(b.autoRestart),
      startedAt: b.startedAt ? num(b.startedAt) : null,
      createdAt: num(b.createdAt),
      lastError: b.lastError ? str(b.lastError) : null,
      tokenMasked: b.tokenMasked ? str(b.tokenMasked) : null,
      updates: num(b.updates),
      replies: num(b.replies),
      ownerId: str(b.ownerId),
      ownerEmail: str(b.ownerEmail),
      ownerName: str(b.ownerName),
      stats: {
        uptimePct: num(statsRaw.uptimePct),
        cpu: num(statsRaw.cpu),
        memMB: num(statsRaw.memMB),
      },
    };
  });

  const users = (r.users as unknown[]).map((item) => {
    const u = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    return {
      id: str(u.id),
      name: str(u.name),
      email: str(u.email),
      plan: str(u.plan) || "free",
      createdAt: num(u.createdAt),
      bots: num(u.bots),
      live: num(u.live),
      updates: num(u.updates),
    };
  });

  const rawStats = (r.stats && typeof r.stats === "object" ? r.stats : {}) as Record<string, unknown>;
  const countStatus = (status: string) => bots.filter((b) => b.status === status).length;
  const stats = {
    users: rawStats.users !== undefined ? num(rawStats.users) : users.length,
    bots: rawStats.bots !== undefined ? num(rawStats.bots) : bots.length,
    live: rawStats.live !== undefined ? num(rawStats.live) : countStatus("live"),
    drafts: rawStats.drafts !== undefined ? num(rawStats.drafts) : countStatus("draft"),
    paused: rawStats.paused !== undefined ? num(rawStats.paused) : countStatus("paused"),
    errors: rawStats.errors !== undefined ? num(rawStats.errors) : countStatus("error"),
    updates: rawStats.updates !== undefined ? num(rawStats.updates) : bots.reduce((n, b) => n + b.updates, 0),
    replies: rawStats.replies !== undefined ? num(rawStats.replies) : bots.reduce((n, b) => n + b.replies, 0),
    restarts: rawStats.restarts !== undefined ? num(rawStats.restarts) : bots.reduce((n, b) => n + b.restartCount, 0),
    packages:
      rawStats.packages !== undefined
        ? num(rawStats.packages)
        : bots.reduce((n, b) => n + b.requirements.split(/[\n,]+/).filter((x) => x.trim()).length, 0),
    suspended:
      rawStats.suspended !== undefined ? num(rawStats.suspended) : users.filter((u) => u.plan === "suspended").length,
  };

  if (!r.settings || typeof r.settings !== "object") {
    return { error: `payload has no settings object (keys: ${keys.join(", ") || "none"})` };
  }
  const settingsRaw = r.settings as Record<string, unknown>;
  const settings = {
    id: settingsRaw.id ? str(settingsRaw.id) : undefined,
    maintenance: bool(settingsRaw.maintenance),
    maintenanceMessage: str(settingsRaw.maintenanceMessage),
    broadcast: str(settingsRaw.broadcast),
    signupsOpen: bool(settingsRaw.signupsOpen, true),
    updatedAt: settingsRaw.updatedAt ? num(settingsRaw.updatedAt) : undefined,
  };

  const engineRaw = (r.engine && typeof r.engine === "object" ? r.engine : {}) as Record<string, unknown>;

  return {
    data: {
      storage: str(r.storage) || "unknown",
      engine: { mode: str(engineRaw.mode) || "unknown", online: bool(engineRaw.online) },
      settings,
      stats,
      users,
      bots,
    },
  };
}

export async function fetchAdminData(
  token: string,
): Promise<ProductResult<import("./types").AdminData>> {
  const result = await operatorFetch<unknown>("/api/admin/data", token);
  if (!result.ok) return result;
  const parsed = normaliseAdminData(result.data);
  if ("error" in parsed) return { ok: false, reason: "unreachable", detail: parsed.error };
  return { ok: true, data: parsed.data, latencyMs: result.latencyMs };
}

export function fetchProductHealth() {
  return operatorFetch<import("./types").ProductHealth>("/api/health", "", { headers: {} });
}

export function savePlatformSettings(
  token: string,
  patch: Partial<import("./types").PlatformSettings>,
) {
  return operatorFetch<{ settings: import("./types").PlatformSettings }>("/api/admin/settings", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export const consoleUrl = (botId?: string) =>
  botId ? `${PRODUCT_BASE}/console/bots/${encodeURIComponent(botId)}` : `${PRODUCT_BASE}/console`;

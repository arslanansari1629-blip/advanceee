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

export function fetchAdminData(token: string) {
  return operatorFetch<import("./types").AdminData>("/api/admin/data", token);
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

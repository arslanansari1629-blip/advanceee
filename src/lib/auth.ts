/**
 * Session helpers for the BotForge admin console.
 *
 * Credentials are never hard-coded in the repository. They come from
 * environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) so the public
 * source tree cannot leak the console password:
 *
 *   .env.local            -> local development
 *   Vercel project env    -> production / preview
 *
 * The session itself is a stateless, HMAC-SHA256 signed cookie so every edge
 * function can verify it without a database round-trip.
 */

export const SESSION_COOKIE = "bf_admin_session";

/** 12 hours by default; "remember me" extends it to 7 days. */
export const SESSION_TTL_SECONDS = 60 * 60 * 12;
export const SESSION_TTL_REMEMBER_SECONDS = 60 * 60 * 24 * 7;

export type Session = {
  /** username as configured in ADMIN_USERNAME */
  user: string;
  /** display name shown in the console */
  name: string;
  iat: number;
  exp: number;
};

const encoder = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(sig);
}

/** Length-independent comparison for short secrets. */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function sessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    // Deterministic fallback so a missing secret degrades to "sessions still
    // work but cannot be forged without knowing the password".
    `${process.env.ADMIN_USERNAME ?? ""}::${process.env.ADMIN_PASSWORD ?? ""}::botforge-admin`
  );
}

export function credentials() {
  const user = process.env.ADMIN_USERNAME ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_DISPLAY_NAME || (user ? user.charAt(0).toUpperCase() + user.slice(1) : "");
  return { user, password, name };
}

export function isAuthConfigured(): boolean {
  const { user, password } = credentials();
  return Boolean(user && password);
}

export function verifyCredentials(username: string, password: string): boolean {
  const c = credentials();
  if (!c.user || !c.password) return false;
  // both comparisons always run so timing does not reveal which half failed
  const userOk = safeEqual(username.trim(), c.user);
  const passOk = safeEqual(password, c.password);
  return userOk && passOk;
}

export async function createSession(username: string, remember = false): Promise<{ token: string; maxAge: number }> {
  const now = Math.floor(Date.now() / 1000);
  const maxAge = remember ? SESSION_TTL_REMEMBER_SECONDS : SESSION_TTL_SECONDS;
  const payload: Session = {
    user: username,
    name: credentials().name || username,
    iat: now,
    exp: now + maxAge,
  };
  const body = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  const sig = b64urlEncode(await hmac(sessionSecret(), body));
  return { token: `${body}.${sig}`, maxAge };
}

export async function readSession(token: string | undefined | null): Promise<Session | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64urlEncode(await hmac(sessionSecret(), body));
  if (!safeEqual(sig, expected)) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as Session;
    if (!parsed?.user || !parsed?.exp) return null;
    if (parsed.exp * 1000 < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/** Build an absolute URL on the real public origin (Vercel sets x-forwarded-*). */
export function publicUrl(request: Request, path: string): URL {
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto = headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return new URL(path, `${proto}://${host}`);
}

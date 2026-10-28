/**
 * Operator (admin) authentication.
 *
 * The panel lives at /admin and is never linked from the public site. The
 * credentials are read from the environment only:
 *
 *   ADMIN_USERNAME / ADMIN_PASSWORD
 *
 * In development they fall back to local defaults so `npm run dev` is usable;
 * in production (NODE_ENV=production) there is no fallback at all — if the env
 * vars are missing the panel stays locked instead of falling back to a guessable
 * value. Nothing in the UI ever prints, hints at or autofills the credentials.
 */
import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "bf_operator";
const TTL_HOURS = 12;

const isProd = process.env.NODE_ENV === "production";
// Hosted deployments (Vercel) must supply credentials through the environment.
// Local runs keep a development fallback so `npm run dev` / `next start` work.
const hosted = Boolean(process.env.VERCEL);

export const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || (hosted ? "" : "editz");
export const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || (hosted ? "" : "editz900s");

const SECRET =
  process.env.AUTH_SECRET || "botforge-cloud-dev-secret-please-set-AUTH_SECRET";

export function adminConfigured(): boolean {
  return Boolean(ADMIN_USERNAME && ADMIN_PASSWORD);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // still do a comparison to keep timing flat
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  if (!adminConfigured()) return false;
  const userOk = safeEqual(username.trim(), ADMIN_USERNAME);
  const passOk = safeEqual(password, ADMIN_PASSWORD);
  return userOk && passOk;
}

function sign(body: string): string {
  return crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
}

export function issueToken(): string {
  const body = Buffer.from(
    JSON.stringify({ r: "operator", x: Date.now() + TTL_HOURS * 3600_000 })
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [body, mac] = token.split(".");
  if (!body || !mac) return false;
  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    return payload?.r === "operator" && typeof payload?.x === "number" && payload.x > Date.now();
  } catch {
    return false;
  }
}

export async function setAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, issueToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: isProd,
    path: "/",
    maxAge: TTL_HOURS * 3600,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

/* Simple in-memory throttle: 10 failed attempts per IP per 5 minutes. */
const attempts = new Map<string, { count: number; first: number }>();

export function throttle(ip: string): { blocked: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.first > 5 * 60_000) {
    attempts.set(ip, { count: 0, first: now });
    return { blocked: false, retryAfter: 0 };
  }
  if (entry.count >= 10) {
    return { blocked: true, retryAfter: Math.ceil((5 * 60_000 - (now - entry.first)) / 1000) };
  }
  return { blocked: false, retryAfter: 0 };
}

export function noteFailure(ip: string) {
  const entry = attempts.get(ip);
  if (entry) entry.count += 1;
  else attempts.set(ip, { count: 1, first: Date.now() });
}

export function clearFailures(ip: string) {
  attempts.delete(ip);
}

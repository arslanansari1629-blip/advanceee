import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db, uid } from "./db";
import type { User } from "./types";

const COOKIE = "bf_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(attempt, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function emailKey(email: string) {
  return email.trim().toLowerCase();
}

export async function findByEmail(email: string): Promise<User | null> {
  const users = (await db.all("users")) as unknown as User[];
  return users.find((u) => u.email === emailKey(email)) ?? null;
}

export async function createUser(email: string, password: string, name: string): Promise<User> {
  const user: User = {
    id: uid("u_"),
    email: emailKey(email),
    name: name.trim() || email.split("@")[0],
    passHash: hashPassword(password),
    createdAt: Date.now(),
    plan: "unlimited-free",
  };
  await db.put("users", user.id, user as unknown as Record<string, unknown>);
  return user;
}

export async function updateUser(id: string, patch: Partial<User>): Promise<User | null> {
  const user = (await db.get("users", id)) as unknown as User | null;
  if (!user) return null;
  const next = { ...user, ...patch, id: user.id };
  await db.put("users", id, next as unknown as Record<string, unknown>);
  return next;
}

/**
 * Sessions are signed cookies, not database rows. Vercel functions are
 * stateless and scale horizontally; a cookie that carries a signed user
 * payload keeps people logged in across instances and cold starts. If the
 * user record is missing (fresh /tmp on a new instance) it is rebuilt from
 * the signed payload, so nobody is randomly signed out.
 */
const SESSION_SECRET =
  process.env.AUTH_SECRET || "botforge-cloud-dev-secret-please-set-AUTH_SECRET";

interface SessionPayload {
  u: string;
  e: string;
  n: string;
  p: string;
  x: number;
}

const b64 = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64url");

function signToken(payload: SessionPayload): string {
  const body = b64(JSON.stringify(payload));
  const mac = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verifyToken(token: string): SessionPayload | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!payload?.u || !payload?.x || payload.x < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(user: User): Promise<string> {
  const payload: SessionPayload = {
    u: user.id,
    e: user.email,
    n: user.name,
    p: user.plan,
    x: Date.now() + SESSION_DAYS * 864e5,
  };
  const token = signToken(payload);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  const existing = (await db.get("users", payload.u)) as unknown as User | null;
  if (existing) return existing;

  // self-heal: the deployment instance changed and lost its local store
  const rebuilt: User = {
    id: payload.u,
    email: payload.e,
    name: payload.n,
    passHash: "",
    createdAt: Date.now(),
    plan: payload.p || "unlimited-free",
  };
  await db.put("users", rebuilt.id, rebuilt as unknown as Record<string, unknown>);
  return rebuilt;
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    createdAt: user.createdAt,
  };
}

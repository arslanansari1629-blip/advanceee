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

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_DAYS * 864e5;
  await db.put("sessions", token, { id: token, userId, expiresAt });
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
  const token = jar.get(COOKIE)?.value;
  if (token) await db.del("sessions", token);
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.get("sessions", token);
  if (!session) return null;
  if ((session.expiresAt as number) < Date.now()) {
    await db.del("sessions", token);
    return null;
  }
  return (await db.get("users", session.userId as string)) as unknown as User | null;
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    hasRunner: Boolean(user.runnerUrl),
    createdAt: user.createdAt,
  };
}

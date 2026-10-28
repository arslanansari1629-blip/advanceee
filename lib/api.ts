import { NextResponse } from "next/server";
import { currentUser } from "./auth";
import type { User } from "./types";
import { isAdmin } from "./admin";

export const json = (data: unknown, status = 200) => NextResponse.json(data as any, { status });

export const bad = (message: string, status = 400) => json({ error: message }, status);

type AuthOk = { user: User; error?: never };
type AuthFail = { user: null; error: NextResponse };

export async function authed(): Promise<AuthOk | AuthFail> {
  const user = await currentUser();
  if (!user) return { user: null, error: bad("Not signed in", 401) };
  return { user };
}

export const isAuthed = (r: unknown): r is AuthOk => Boolean((r as any)?.user);

export async function readJson<T = any>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

type AdminOk = { ok: true };
type AdminFail = { ok: false; error: NextResponse };

/** Guard for every /api/admin/* handler. */
export async function adminOnly(): Promise<AdminOk | AdminFail> {
  if (!(await isAdmin())) {
    return { ok: false, error: bad("Operator session required", 401) };
  }
  return { ok: true };
}

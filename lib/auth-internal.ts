/** Seeding helpers that avoid the `cookies()` dependency in lib/auth. */
import { db, uid } from "./db";
import { hashPassword } from "./auth";
import type { User } from "./types";

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = (await db.all("users")) as unknown as User[];
  return users.find((u) => u.email === email.trim().toLowerCase()) ?? null;
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  plan = "unlimited-free"
): Promise<User> {
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  const user: User = {
    id: uid("u_"),
    email: email.trim().toLowerCase(),
    name: name.trim() || email.split("@")[0],
    passHash: hashPassword(password),
    createdAt: Date.now(),
    plan,
  };
  await db.put("users", user.id, user as unknown as Record<string, unknown>);
  return user;
}

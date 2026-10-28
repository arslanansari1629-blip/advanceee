import { createSession, findByEmail, publicUser, verifyPassword } from "@/lib/auth";
import { bad, json, readJson } from "@/lib/api";
import { ensureSeed } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureSeed();
  const body = await readJson<{ email?: string; password?: string }>(req);
  if (!body?.email || !body.password) return bad("Email and password are required");
  const user = await findByEmail(body.email);
  if (!user || !verifyPassword(body.password, user.passHash)) return bad("Invalid email or password", 401);
  await createSession(user);
  return json({ user: publicUser(user) });
}

import crypto from "node:crypto";
import { authed, json } from "@/lib/api";
import { updateUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The wizard needs the runner secret to render a copy-paste install command.
 * It is the caller's own secret, served only to their authenticated session.
 * POST rotates it (and the runner must be reconfigured to match).
 */
export async function GET() {
  const a = await authed();
  if (!a.user) return a.error;
  return json({ secret: a.user.runnerSecret ?? null });
}

export async function POST() {
  const a = await authed();
  if (!a.user) return a.error;
  const secret = crypto.randomBytes(24).toString("hex");
  await updateUser(a.user.id, { runnerSecret: secret });
  return json({ secret });
}

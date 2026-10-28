import {
  adminConfigured,
  clearFailures,
  noteFailure,
  setAdminCookie,
  throttle,
  verifyAdminCredentials,
} from "@/lib/admin";
import { bad, json, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ipOf = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("x-real-ip") ||
  "local";

export async function POST(req: Request) {
  const ip = ipOf(req);
  const gate = throttle(ip);
  if (gate.blocked) {
    return bad(`Too many attempts. Try again in ${gate.retryAfter}s.`, 429);
  }
  if (!adminConfigured()) {
    return bad("Operator access is not configured on this deployment.", 503);
  }

  const body = await readJson<{ username?: string; password?: string }>(req);
  if (!body?.username || !body?.password) return bad("Credentials required", 400);

  if (!verifyAdminCredentials(body.username, body.password)) {
    noteFailure(ip);
    return bad("Access denied", 401);
  }

  clearFailures(ip);
  await setAdminCookie();
  return json({ ok: true });
}

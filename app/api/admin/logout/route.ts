import { clearAdminCookie } from "@/lib/admin";
import { json } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearAdminCookie();
  return json({ ok: true });
}

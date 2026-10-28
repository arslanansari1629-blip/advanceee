import { json } from "@/lib/api";
import { adminConfigured, isAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health probe for the operator panel. Returns only booleans — never the
 * account, the password, or any hint about them.
 */
export async function GET() {
  return json({
    configured: adminConfigured(),
    authed: await isAdmin(),
  });
}

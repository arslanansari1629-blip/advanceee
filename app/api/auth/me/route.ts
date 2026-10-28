import { currentUser, publicUser } from "@/lib/auth";
import { json } from "@/lib/api";
import { ensureSeed } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const user = await currentUser();
  if (!user) return json({ user: null });
  return json({ user: publicUser(user) });
}

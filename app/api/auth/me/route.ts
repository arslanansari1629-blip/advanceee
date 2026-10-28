import { currentUser, publicUser } from "@/lib/auth";
import { json } from "@/lib/api";
import { runnerTarget } from "@/lib/runner";
import { ensureSeed } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const user = await currentUser();
  if (!user) return json({ user: null });
  const target = runnerTarget(user);
  return json({
    user: publicUser(user),
    runnerUrl: target.url,
    hasRunnerSecret: Boolean(target.secret),
  });
}

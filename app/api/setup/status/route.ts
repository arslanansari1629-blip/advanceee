import { authed, json } from "@/lib/api";
import { listBots } from "@/lib/bots";
import { storageMode } from "@/lib/db";
import { runnerHealth } from "@/lib/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everything the setup wizard needs to know what is still missing. */
export async function GET() {
  const a = await authed();
  if (!a.user) return a.error;

  const bots = await listBots(a.user.id);
  const runner = await runnerHealth(a.user);

  return json({
    storage: storageMode(),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    runnerUrl: a.user.runnerUrl ?? null,
    hasSecret: Boolean(a.user.runnerSecret || process.env.RUNNER_SECRET),
    runner,
    bots: {
      total: bots.length,
      running: bots.filter((b) => b.status === "running").length,
      newest: bots[0] ? { id: bots[0].id, name: bots[0].name } : null,
    },
    ready: runner.connected,
  });
}

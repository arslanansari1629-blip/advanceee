import { authed, json } from "@/lib/api";
import { listBots, previewStats, refreshStatuses } from "@/lib/bots";
import { runnerHealth } from "@/lib/runner";
import { storageMode } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const a = await authed();
  if (!a.user) return a.error;

  const bots = await refreshStatuses(a.user, await listBots(a.user.id));
  const runner = await runnerHealth(a.user);

  const running = bots.filter((b) => b.status === "running");
  const crashed = bots.filter((b) => b.status === "crashed");
  const installing = bots.filter((b) => b.status === "installing");
  const totalRestarts = bots.reduce((n, b) => n + b.restartCount, 0);
  const packages = new Set<string>();
  for (const b of bots) for (const p of b.installed ?? []) packages.add(p);

  const events = bots
    .flatMap((b) => (b.events ?? []).map((e) => ({ ...e, botId: b.id, botName: b.name })))
    .sort((x, y) => y.ts - x.ts)
    .slice(0, 14);

  const uptime =
    running.length === 0
      ? 100
      : Number(
          (
            running.reduce((n, b) => n + previewStats(b).uptimePct, 0) / running.length
          ).toFixed(2)
        );

  return json({
    runner,
    storage: storageMode(),
    stats: {
      total: bots.length,
      running: running.length,
      stopped: bots.filter((b) => b.status === "stopped").length,
      crashed: crashed.length,
      installing: installing.length,
      restarts: totalRestarts,
      packages: packages.size,
      uptime,
      cpu: Number(running.reduce((n, b) => n + previewStats(b).cpu, 0).toFixed(2)),
      memMB: Number(running.reduce((n, b) => n + previewStats(b).memMB, 0).toFixed(1)),
    },
    bots: bots.map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      mode: b.mode,
      framework: b.framework,
      entry: b.entry,
      requirements: b.requirements,
      startedAt: b.startedAt,
      stoppedAt: b.stoppedAt,
      createdAt: b.createdAt,
      restartCount: b.restartCount,
      autoRestart: b.autoRestart,
      tokenMasked: b.tokenMasked,
      lastError: b.lastError,
      stats: { ...b.stats, ...previewStats(b) },
    })),
    events,
  });
}

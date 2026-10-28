import { adminOnly, json } from "@/lib/api";
import { previewStats } from "@/lib/bots";
import { storageMode } from "@/lib/db";
import { getPlatformSettings } from "@/lib/settings";
import { runnerHealth } from "@/lib/runner";
import { listBots } from "@/lib/bots";
import { db } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";
import type { Bot, User } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await adminOnly();
  if (!gate.ok) return gate.error;
  await ensureSeed();

  const [usersRaw, botsRaw, settings, runner] = await Promise.all([
    db.all("users"),
    db.all("bots"),
    getPlatformSettings(),
    runnerHealth(null),
  ]);

  const users = usersRaw as unknown as User[];
  const bots = botsRaw as unknown as Bot[];
  const userById = new Map(users.map((u) => [u.id, u]));

  const running = bots.filter((b) => b.status === "running");
  const crashed = bots.filter((b) => b.status === "crashed");
  const packages = new Set<string>();
  for (const b of bots) for (const p of b.installed ?? []) packages.add(p);

  return json({
    storage: storageMode(),
    runner,
    settings,
    stats: {
      users: users.length,
      bots: bots.length,
      running: running.length,
      stopped: bots.filter((b) => b.status === "stopped").length,
      crashed: crashed.length,
      installing: bots.filter((b) => b.status === "installing").length,
      restarts: bots.reduce((n, b) => n + (b.restartCount ?? 0), 0),
      packages: packages.size,
      cpu: Number(running.reduce((n, b) => n + previewStats(b).cpu, 0).toFixed(2)),
      memMB: Number(running.reduce((n, b) => n + previewStats(b).memMB, 0).toFixed(1)),
      suspended: users.filter((u) => u.plan === "suspended").length,
    },
    users: users
      .map((u) => {
        const mine = bots.filter((b) => b.userId === u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          plan: u.plan,
          createdAt: u.createdAt,
          runnerUrl: u.runnerUrl ?? null,
          bots: mine.length,
          live: mine.filter((b) => b.status === "running").length,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt),
    bots: bots
      .map((b) => ({
        id: b.id,
        name: b.name,
        status: b.status,
        mode: b.mode,
        framework: b.framework,
        entry: b.entry,
        requirements: b.requirements,
        restartCount: b.restartCount,
        autoRestart: b.autoRestart,
        startedAt: b.startedAt,
        createdAt: b.createdAt,
        lastError: b.lastError,
        tokenMasked: b.tokenMasked,
        ownerId: b.userId,
        ownerEmail: userById.get(b.userId)?.email ?? "orphaned",
        ownerName: userById.get(b.userId)?.name ?? "—",
        stats: { ...b.stats, ...previewStats(b) },
      }))
      .sort((a, b) => (b.startedAt ?? b.createdAt) - (a.startedAt ?? a.createdAt)),
  });
}

export async function POST(req: Request) {
  const gate = await adminOnly();
  if (!gate.ok) return gate.error;

  // quick action: log every bot for one user (used by the drill-down view)
  const body = await req.json().catch(() => ({}));
  if (body?.userId) {
    const bots = (await listBots(body.userId)) as Bot[];
    return json({ bots });
  }
  return json({ ok: true });
}

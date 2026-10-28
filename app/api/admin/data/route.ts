import { adminOnly, json } from "@/lib/api";
import { storageMode } from "@/lib/db";
import { getPlatformSettings } from "@/lib/settings";
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

  const [usersRaw, botsRaw, settings] = await Promise.all([
    db.all("users"),
    db.all("bots"),
    getPlatformSettings(),
  ]);

  const users = usersRaw as unknown as User[];
  const bots = botsRaw as unknown as Bot[];
  const userById = new Map(users.map((u) => [u.id, u]));

  const live = bots.filter((b) => b.status === "live");
  const errored = bots.filter((b) => b.status === "error");
  const packages = new Set<string>();
  for (const b of bots) for (const p of (b.requirements ?? "").split("\n").filter(Boolean)) packages.add(p);

  return json({
    storage: storageMode(),
    engine: { mode: "webhook", online: true },
    settings,
    stats: {
      users: users.length,
      bots: bots.length,
      live: live.length,
      drafts: bots.filter((b) => b.status === "draft").length,
      paused: bots.filter((b) => b.status === "paused").length,
      errors: errored.length,
      updates: bots.reduce((n, b) => n + (b.telegram?.updates ?? 0), 0),
      replies: bots.reduce((n, b) => n + (b.telegram?.replies ?? 0), 0),
      restarts: bots.reduce((n, b) => n + (b.restartCount ?? 0), 0),
      packages: packages.size,
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
          bots: mine.length,
          live: mine.filter((b) => b.status === "live").length,
          updates: mine.reduce((n, b) => n + (b.telegram?.updates ?? 0), 0),
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt),
    bots: bots
      .map((b) => ({
        id: b.id,
        name: b.name,
        status: b.status,
        username: b.telegram?.username ?? null,
        framework: b.framework,
        entry: b.entry,
        requirements: b.requirements,
        restartCount: b.restartCount,
        autoRestart: b.autoRestart,
        startedAt: b.startedAt,
        createdAt: b.createdAt,
        lastError: b.lastError,
        tokenMasked: b.tokenMasked,
        updates: b.telegram?.updates ?? 0,
        replies: b.telegram?.replies ?? 0,
        ownerId: b.userId,
        ownerEmail: userById.get(b.userId)?.email ?? "orphaned",
        ownerName: userById.get(b.userId)?.name ?? "—",
        stats: b.stats,
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

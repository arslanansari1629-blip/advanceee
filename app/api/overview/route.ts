import { authed, json } from "@/lib/api";
import { listBots, publicBot, refreshStatuses, uptimePct } from "@/lib/bots";
import { storageMode } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";
import { siteUrl } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const a = await authed();
  if (!a.user) return a.error;

  const bots = await refreshStatuses(await listBots(a.user.id));

  const live = bots.filter((b) => b.status === "live");
  const updates = bots.reduce((n, b) => n + (b.telegram?.updates ?? 0), 0);
  const replies = bots.reduce((n, b) => n + (b.telegram?.replies ?? 0), 0);
  const errors = bots.reduce((n, b) => n + (b.telegram?.errors ?? 0), 0);
  const pending = bots.reduce((n, b) => n + (b.telegram?.pendingUpdates ?? 0), 0);

  const events = bots
    .flatMap((b) => (b.events ?? []).map((e) => ({ ...e, botId: b.id, botName: b.name })))
    .sort((x, y) => y.ts - x.ts)
    .slice(0, 14);

  const up =
    live.length === 0 ? 100 : Number((live.reduce((n, b) => n + uptimePct(b), 0) / live.length).toFixed(2));

  return json({
    engine: {
      mode: "webhook",
      siteUrl: siteUrl(),
      database: storageMode(),
      online: true,
    },
    storage: storageMode(),
    stats: {
      total: bots.length,
      live: live.length,
      drafts: bots.filter((b) => b.status === "draft").length,
      paused: bots.filter((b) => b.status === "paused").length,
      errors: bots.filter((b) => b.status === "error").length,
      updates,
      replies,
      failed: errors,
      pending,
      uptime: up,
    },
    bots: bots.map(publicBot),
    events,
  });
}

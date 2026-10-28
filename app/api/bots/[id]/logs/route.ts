import { authed, bad, json } from "@/lib/api";
import { clearLogs, getBot, readLogs } from "@/lib/bots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const a = await authed();
  if (!a.user) return a.error;
  const { id } = await ctx.params;
  const bot = await getBot(id);
  if (!bot || bot.userId !== a.user.id) return bad("Bot not found", 404);

  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const page = await readLogs(a.user, bot, after);

  return json({
    ...page,
    bot: {
      id: bot.id,
      status: bot.status,
      mode: bot.mode,
      startedAt: bot.startedAt,
      restartCount: bot.restartCount,
      autoRestart: bot.autoRestart,
      lastError: bot.lastError,
      installState: bot.installState,
      installed: bot.installed,
      stats: bot.stats,
    },
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const a = await authed();
  if (!a.user) return a.error;
  const { id } = await ctx.params;
  const bot = await getBot(id);
  if (!bot || bot.userId !== a.user.id) return bad("Bot not found", 404);
  await clearLogs(bot.id);
  return json({ ok: true });
}

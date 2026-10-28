import { adminOnly, bad, json } from "@/lib/api";
import { getBot, readLogs } from "@/lib/bots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live logs for any bot on the platform. */
export async function GET(req: Request) {
  const gate = await adminOnly();
  if (!gate.ok) return gate.error;

  const url = new URL(req.url);
  const botId = url.searchParams.get("botId");
  const after = Number(url.searchParams.get("after") ?? 0) || 0;
  if (!botId) return bad("botId required");

  const bot = await getBot(botId);
  if (!bot) return bad("Bot not found", 404);

  const page = await readLogs(bot, after);
  return json({
    ...page,
    bot: {
      id: bot.id,
      name: bot.name,
      status: bot.status,
      username: bot.telegram?.username ?? null,
      framework: bot.framework,
      startedAt: bot.startedAt,
      restartCount: bot.restartCount,
      installed: bot.requirements.split("\n").filter(Boolean),
    },
  });
}

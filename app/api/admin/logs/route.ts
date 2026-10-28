import { adminOnly, bad, json } from "@/lib/api";
import { getBot, readLogs } from "@/lib/bots";
import { db } from "@/lib/db";
import type { User } from "@/lib/types";

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

  let owner = (await db.get("users", bot.userId)) as unknown as User | null;
  if (!owner) {
    owner = {
      id: bot.userId,
      email: "orphaned@local",
      name: "Orphaned",
      passHash: "",
      createdAt: Date.now(),
      plan: "unlimited-free",
    };
  }

  const page = await readLogs(owner, bot, after);
  return json({
    ...page,
    bot: {
      id: bot.id,
      name: bot.name,
      status: bot.status,
      mode: bot.mode,
      framework: bot.framework,
      startedAt: bot.startedAt,
      restartCount: bot.restartCount,
      installed: bot.installed,
    },
  });
}

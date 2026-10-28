import { adminOnly, bad, json, readJson } from "@/lib/api";
import { addEvent, deleteBot, getBot, goLive, pauseBot, restartBot, saveBot } from "@/lib/bots";
import { db } from "@/lib/db";
import type { User } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Operators can drive any bot on the platform, regardless of owner. */
export async function POST(req: Request) {
  const gate = await adminOnly();
  if (!gate.ok) return gate.error;

  const body = await readJson<{ botId?: string; action?: string }>(req);
  if (!body?.botId || !body.action) return bad("botId and action are required");

  const bot = await getBot(body.botId);
  if (!bot) return bad("Bot not found", 404);

  const owner = (await db.get("users", bot.userId)) as unknown as User | null;
  if (!owner) {
    // orphaned bot: no owner row (fresh instance). Rebuild a shell owner so the
    // lifecycle service has something to work with.
    const shell: User = {
      id: bot.userId,
      email: "orphaned@local",
      name: "Orphaned",
      passHash: "",
      createdAt: Date.now(),
      plan: "unlimited-free",
    };
    await db.put("users", shell.id, shell as unknown as Record<string, unknown>);
    return handleAction(shell, bot.id, body.action);
  }

  return handleAction(owner, bot.id, body.action);
}

async function handleAction(owner: User, botId: string, action: string) {
  const bot = await getBot(botId);
  if (!bot) return bad("Bot not found", 404);

  switch (action) {
    case "start":
      addEvent(bot, "note", "Started by operator");
      await saveBot(bot);
      await goLive(owner, bot);
      break;
    case "stop":
      await pauseBot(owner, bot, "Paused by operator");
      break;
    case "restart":
      addEvent(bot, "note", "Restart issued by operator");
      await saveBot(bot);
      await restartBot(owner, bot);
      break;
    case "redeploy": {
      bot.restartCount += 1;
      addEvent(bot, "note", "Redeploy issued by operator");
      await saveBot(bot);
      await goLive(owner, bot, { restart: true });
      break;
    }
    case "delete":
      await deleteBot(bot);
      return json({ ok: true, deleted: true });
    default:
      return bad("Unknown action");
  }

  return json({ ok: true });
}

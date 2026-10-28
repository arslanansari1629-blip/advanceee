import { authed, bad, json, readJson } from "@/lib/api";
import {
  addEvent,
  getBot,
  goLive,
  pauseBot,
  publicBot,
  restartBot,
  saveBot,
  syncTelegram,
} from "@/lib/bots";
import { compileBehaviour } from "@/lib/behavior";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const a = await authed();
  if (!a.user) return a.error;
  const { id } = await ctx.params;
  const bot = await getBot(id);
  if (!bot || bot.userId !== a.user.id) return bad("Bot not found", 404);

  const body = await readJson<{ action?: string }>(req);

  switch (body?.action) {
    case "start":
      await goLive(a.user, bot);
      break;
    case "stop":
      await pauseBot(a.user, bot);
      break;
    case "restart":
      await restartBot(a.user, bot);
      break;
    case "redeploy": {
      bot.behaviour = compileBehaviour(bot.content);
      addEvent(bot, "deploy", "Redeploy · behaviour recompiled from source");
      await saveBot(bot);
      await goLive(a.user, bot, { restart: true });
      break;
    }
    case "sync":
      await syncTelegram(bot, true);
      break;
    case "toggle-auto-restart": {
      bot.autoRestart = !bot.autoRestart;
      addEvent(bot, "note", `Auto re-register ${bot.autoRestart ? "enabled" : "disabled"}`);
      await saveBot(bot);
      break;
    }
    default:
      return bad("Unknown action");
  }

  return json({ bot: publicBot(bot) });
}

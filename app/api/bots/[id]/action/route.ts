import { authed, bad, json, readJson } from "@/lib/api";
import { addEvent, deployBot, getBot, restartBot, saveBot, stopBot } from "@/lib/bots";

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
  const action = body?.action;

  switch (action) {
    case "start":
      await deployBot(a.user, bot);
      break;
    case "stop":
      await stopBot(a.user, bot);
      break;
    case "restart":
      await restartBot(a.user, bot);
      break;
    case "redeploy": {
      bot.restartCount += 1;
      addEvent(bot, "deploy", "Redeploy with latest files & requirements");
      await saveBot(bot);
      await deployBot(a.user, bot, { restart: true });
      break;
    }
    case "toggle-auto-restart": {
      bot.autoRestart = !bot.autoRestart;
      addEvent(
        bot,
        "note",
        `Auto-restart ${bot.autoRestart ? "enabled" : "disabled"}`
      );
      await saveBot(bot);
      break;
    }
    default:
      return bad("Unknown action");
  }

  return json({ bot });
}

import { authed, bad, json, readJson } from "@/lib/api";
import {
  addEvent,
  deleteBot,
  getBot,
  previewStats,
  saveBot,
  stopBot,
} from "@/lib/bots";
import { analyzeSource, extractCommands } from "@/lib/pyreqs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function own(id: string, userId: string) {
  const bot = await getBot(id);
  if (!bot || bot.userId !== userId) return null;
  return bot;
}

export async function GET(_req: Request, ctx: Ctx) {
  const a = await authed();
  if (!a.user) return a.error;
  const { id } = await ctx.params;
  const bot = await own(id, a.user.id);
  if (!bot) return bad("Bot not found", 404);
  return json({ bot: { ...bot, stats: { ...bot.stats, ...previewStats(bot) } } });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const a = await authed();
  if (!a.user) return a.error;
  const { id } = await ctx.params;
  const bot = await own(id, a.user.id);
  if (!bot) return bad("Bot not found", 404);

  const body = await readJson<any>(req);
  if (!body) return bad("Invalid body");

  if (typeof body.name === "string" && body.name.trim()) bot.name = body.name.trim().slice(0, 48);
  if (body.env && typeof body.env === "object") {
    bot.env = Object.fromEntries(
      Object.entries(body.env)
        .filter(([k, v]) => k.trim() && typeof v === "string")
        .map(([k, v]) => [k.trim(), v as string])
    );
  }
  if (typeof body.autoRestart === "boolean") bot.autoRestart = body.autoRestart;
  if (Array.isArray(body.files) && body.files.length) {
    bot.files = body.files
      .filter((f: any) => f?.path && typeof f.content === "string")
      .map((f: any) => ({ path: f.path, content: f.content }));
    if (!bot.files.some((f) => f.path === bot.entry)) bot.entry = bot.files[0].path;
    const entryFile = bot.files.find((f) => f.path === bot.entry)!;
    bot.content = entryFile.content;
    bot.path = entryFile.path;
    const analysis = analyzeSource(entryFile.content, bot.files.filter((f) => f.path !== bot.entry));
    bot.framework = analysis.framework;
    bot.frameworkId = analysis.frameworkId;
    bot.tokenMasked = analysis.tokenMasked;
    bot.previewCommands = extractCommands(bot.files.map((f) => f.content).join("\n"));
    if (typeof body.requirements !== "string") bot.requirements = analysis.requirements;
  }
  if (typeof body.requirements === "string") bot.requirements = body.requirements;

  addEvent(bot, "edit", "Configuration updated — redeploy to apply");
  await saveBot(bot);
  return json({ bot });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const a = await authed();
  if (!a.user) return a.error;
  const { id } = await ctx.params;
  const bot = await own(id, a.user.id);
  if (!bot) return bad("Bot not found", 404);
  if (bot.status === "running") await stopBot(a.user, bot, "Deleted by user");
  await deleteBot(bot.id);
  return json({ ok: true });
}

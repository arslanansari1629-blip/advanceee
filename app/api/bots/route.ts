import { authed, bad, json, readJson } from "@/lib/api";
import {
  createBot,
  goLive,
  listBots,
  publicBot,
  refreshStatuses,
  tokenFromSource,
} from "@/lib/bots";
import { analyzeSource } from "@/lib/pyreqs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const a = await authed();
  if (!a.user) return a.error;
  const bots = await refreshStatuses(await listBots(a.user.id));
  return json({ bots: bots.map(publicBot) });
}

interface CreateBody {
  name?: string;
  entry?: string;
  files?: { path: string; content: string }[];
  requirements?: string;
  env?: Record<string, string>;
  deploy?: boolean;
}

export async function POST(req: Request) {
  const a = await authed();
  if (!a.user) return a.error;

  const body = await readJson<CreateBody>(req);
  const files = (body?.files ?? []).filter((f) => f?.path && typeof f.content === "string");
  if (!files.length) return bad("Paste some Python code first");

  const entry = body?.entry && files.some((f) => f.path === body.entry) ? body.entry : files[0].path;
  const source = files.find((f) => f.path === entry)!.content;
  const analysis = analyzeSource(source, files.filter((f) => f.path !== entry));

  const requirements =
    typeof body?.requirements === "string" && body.requirements.trim().length > 0
      ? body.requirements
      : analysis.requirements;

  const env = body?.env ?? {};
  const token =
    env.BOT_TOKEN?.trim() ||
    env.TOKEN?.trim() ||
    analysis.tokens[0] ||
    tokenFromSource(source) ||
    null;

  const bot = await createBot(a.user.id, {
    name: (body?.name || "untitled-bot").slice(0, 48),
    entry,
    files,
    requirements,
    env,
    framework: analysis.framework,
    frameworkId: analysis.frameworkId,
    token,
  });

  if (body?.deploy) await goLive(a.user, bot);

  return json({ bot: publicBot(bot), analysis });
}

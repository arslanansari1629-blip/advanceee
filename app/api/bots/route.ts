import { authed, bad, json, readJson } from "@/lib/api";
import { createBot, deployBot, listBots, refreshStatuses } from "@/lib/bots";
import { analyzeSource, maskToken, parseRequirements } from "@/lib/pyreqs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const a = await authed();
  if (!a.user) return a.error;
  const bots = await refreshStatuses(a.user, await listBots(a.user.id));
  return json({ bots });
}

interface CreateBody {
  name?: string;
  entry?: string;
  files?: { path: string; content: string }[];
  requirements?: string;
  env?: Record<string, string>;
  autoRestart?: boolean;
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

  const token = analysis.tokens[0] ?? null;
  const bot = await createBot(a.user.id, {
    name: (body?.name || "untitled-bot").slice(0, 48),
    entry,
    files,
    requirements,
    env: body?.env ?? {},
    autoRestart: body?.autoRestart ?? true,
    framework: analysis.framework,
    frameworkId: analysis.frameworkId,
    tokenMasked: token ? analysis.tokenMasked ?? maskToken(token) : null,
  });

  if (body?.deploy) await deployBot(a.user, bot);

  return json({ bot, analysis, requirements: parseRequirements(requirements) });
}

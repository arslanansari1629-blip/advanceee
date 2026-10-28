import { createSession, createUser, findByEmail, publicUser } from "@/lib/auth";
import { bad, json, readJson, validEmail } from "@/lib/api";
import { createBot } from "@/lib/bots";
import { analyzeSource } from "@/lib/pyreqs";
import { templateById } from "@/lib/templates";
import { getPlatformSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const platform = await getPlatformSettings();
  if (!platform.signupsOpen) return bad("New registrations are temporarily closed.", 403);

  const body = await readJson<{ email?: string; password?: string; name?: string }>(req);
  if (!body?.email || !validEmail(body.email)) return bad("Enter a valid email address");
  if (!body.password || body.password.length < 6) return bad("Password must be at least 6 characters");
  if (await findByEmail(body.email)) return bad("An account with that email already exists", 409);

  const user = await createUser(body.email, body.password, body.name ?? "");
  await createSession(user);

  // Kick things off with a real, deployable starter bot instead of an empty dashboard.
  const tpl = templateById("ptb-echo")!;
  const analysis = analyzeSource(tpl.code);
  await createBot(user.id, {
    name: "echo-bot",
    entry: "main.py",
    files: [{ path: "main.py", content: tpl.code }],
    requirements: analysis.requirements,
    env: { BOT_TOKEN: "" },
    autoRestart: true,
    framework: analysis.framework,
    frameworkId: analysis.frameworkId,
    tokenMasked: null,
  });

  return json({ user: publicUser(user) });
}

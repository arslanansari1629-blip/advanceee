import { authed, bad, json, readJson } from "@/lib/api";
import { updateUser } from "@/lib/auth";
import { isRunnerUrl, runnerHealth } from "@/lib/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const a = await authed();
  if (!a.user) return a.error;
  const info = await runnerHealth(a.user);
  return json({ runner: info, runnerUrl: a.user.runnerUrl ?? null });
}

export async function POST(req: Request) {
  const a = await authed();
  if (!a.user) return a.error;
  const body = await readJson<{ url?: string; secret?: string }>(req);
  if (!body) return bad("Invalid body");

  const url = (body.url ?? "").trim().replace(/\/+$/, "");
  if (url && !isRunnerUrl(url)) return bad("Runner URL must start with http:// or https://");

  await updateUser(a.user.id, {
    runnerUrl: url || undefined,
    runnerSecret: body.secret ?? a.user.runnerSecret,
  });
  const refreshed = { ...a.user, runnerUrl: url || undefined, runnerSecret: body.secret ?? a.user.runnerSecret };
  const info = await runnerHealth(refreshed as any);
  return json({ runner: info });
}

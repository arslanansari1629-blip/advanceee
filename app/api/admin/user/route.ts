import { adminOnly, bad, json, readJson } from "@/lib/api";
import { deleteBot, getBot } from "@/lib/bots";
import { db } from "@/lib/db";
import type { Bot, User } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLANS = new Set(["unlimited-free", "pro", "founder", "suspended"]);

/** Operators can change a plan, suspend, restore or delete an account. */
export async function POST(req: Request) {
  const gate = await adminOnly();
  if (!gate.ok) return gate.error;

  const body = await readJson<{ userId?: string; action?: string; plan?: string; name?: string }>(req);
  if (!body?.userId || !body.action) return bad("userId and action are required");

  const user = (await db.get("users", body.userId)) as unknown as User | null;
  if (!user) return bad("User not found", 404);

  switch (body.action) {
    case "plan": {
      if (!body.plan || !PLANS.has(body.plan)) return bad("Unknown plan");
      const next = { ...user, plan: body.plan };
      await db.put("users", user.id, next as unknown as Record<string, unknown>);
      return json({ ok: true, user: { id: next.id, plan: next.plan } });
    }
    case "rename": {
      const name = (body.name ?? "").trim().slice(0, 60);
      if (!name) return bad("Name required");
      const next = { ...user, name };
      await db.put("users", user.id, next as unknown as Record<string, unknown>);
      return json({ ok: true });
    }
    case "delete": {
      const bots = ((await db.all("bots")) as unknown as Bot[]).filter((b) => b.userId === user.id);
      for (const bot of bots) {
        const live = await getBot(bot.id);
        if (live) await deleteBot(live);
      }
      await db.del("users", user.id);
      return json({ ok: true, deletedBots: bots.length });
    }
    default:
      return bad("Unknown action");
  }
}

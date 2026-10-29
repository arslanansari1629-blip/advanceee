import { NextResponse } from "next/server";
import { bots, botOwner, getBot } from "@/lib/data";
import type { BotStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const bot = getBot(params.id) ?? bots.find((b) => b.slug === params.id);
  if (!bot) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(
    {
      ...bot,
      source: undefined,
      token: undefined,
      owner: botOwner(bot),
      env: bot.env.map((e) => ({ key: e.key, secret: e.secret, value: e.secret ? "••••••••" : e.value })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const bot = getBot(params.id) ?? bots.find((b) => b.slug === params.id);
  if (!bot) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let body: { status?: BotStatus; env?: Record<string, string> } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const allowed: BotStatus[] = ["live", "paused", "error", "draft", "compiling"];
  if (body.status && !allowed.includes(body.status)) {
    return NextResponse.json({ error: "invalid_status", allowed }, { status: 422 });
  }

  return NextResponse.json({
    id: bot.id,
    status: body.status ?? bot.status,
    applied_at: new Date().toISOString(),
    note: "Demo mutation — the seeded dataset is immutable, refresh to reset",
    audit: { action: body.status === "paused" ? "bot.pause" : "bot.update", actor: "api:demo" },
  });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const bot = getBot(params.id) ?? bots.find((b) => b.slug === params.id);
  if (!bot) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    id: bot.id,
    deleted: true,
    purge_after: new Date(Date.now() + 30 * 864e5).toISOString(),
    note: "Soft delete · demo dataset is not mutated",
  });
}

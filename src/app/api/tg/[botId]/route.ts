import { NextResponse } from "next/server";
import { getBot } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Simulated Telegram webhook endpoint.
 *
 * POST a Telegram update here and the demo engine "compiles" a reply the same
 * way the real BotForge webhook gateway would. Nothing leaves the sandbox.
 */
export async function POST(request: Request, { params }: { params: { botId: string } }) {
  const bot = getBot(params.botId);
  if (!bot) return NextResponse.json({ ok: false, description: "bot not found" }, { status: 404 });

  if (bot.status === "paused" || bot.status === "draft") {
    return NextResponse.json({ ok: false, description: "bot is not live" }, { status: 503 });
  }

  let update: {
    update_id?: number;
    message?: { message_id?: number; text?: string; chat?: { id?: number }; from?: { username?: string; first_name?: string } };
    callback_query?: { data?: string; from?: { username?: string } };
  } = {};
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false, description: "invalid update payload" }, { status: 400 });
  }

  const started = Date.now();
  const text = update.message?.text ?? update.callback_query?.data ?? "";
  const from = update.message?.from?.first_name ?? update.callback_query?.from?.username ?? "friend";
  const chat = update.message?.chat?.id ?? 0;

  let reply = `Echo: ${text}`;
  if (text.startsWith("/start")) reply = `Hey ${from}! I am live 24/7.`;
  else if (text.startsWith("/help")) reply = `Commands: ${bot.handlers.join(" ")}`;
  else if (text.startsWith("/price")) reply = "Pro is $29/mo, Scale is $149/mo.";
  else if (update.callback_query) reply = `Callback ${text} acknowledged.`;

  return NextResponse.json({
    ok: true,
    bot: { id: bot.id, slug: bot.slug, library: bot.library, version: bot.version },
    received: { update_id: update.update_id ?? 400001, chat_id: chat, text },
    reply: { text: reply, parse_mode: "HTML", latency_ms: Date.now() - started + 38 },
    engine: "botforge-webhook-v3",
    note: "Simulated response — no Bot API request was sent",
  });
}

export async function GET(_request: Request, { params }: { params: { botId: string } }) {
  const bot = getBot(params.botId);
  if (!bot) return NextResponse.json({ ok: false, description: "bot not found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    webhook: { url: bot.webhook.url, pending_update_count: 0, last_error_date: null, max_connections: 40 },
    bot: { status: bot.status, handlers: bot.handlers },
    note: "Simulated getWebhookInfo",
  });
}

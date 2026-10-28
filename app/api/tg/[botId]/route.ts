import { appendLogs, getBot, recoverBot, saveBot } from "@/lib/bots";
import { renderTemplate } from "@/lib/behavior";
import { callTelegram, open, sendMessage } from "@/lib/telegram";
import type { Behaviour, Bot } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Telegram webhook endpoint.
 *
 * Telegram POSTs every update here. We answer in-process and return 200 within
 * milliseconds, so the bot is "online" whenever Telegram has something to say —
 * no long-running process exists at any point.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ botId: string }> }) {
  const { botId } = await ctx.params;
  return new Response(`BotForge webhook endpoint for ${botId}. Telegram posts updates here.`, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

interface TgUpdate {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    text?: string;
    chat: { id: number; type: string; title?: string };
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number; first_name?: string; username?: string };
    message?: { message_id: number; chat: { id: number } };
  };
  inline_query?: { id: string; query: string; from: { id: number; first_name?: string } };
}

/** Telegram needs parse_mode when the compiled reply contains HTML tags. */
function parseModeFor(bot: Bot, text: string): "HTML" | "Markdown" | "MarkdownV2" | undefined {
  if (bot.behaviour.parseMode) return bot.behaviour.parseMode;
  if (/<\/?(?:b|strong|i|em|u|s|code|pre|a|tg-spoiler)\b[^>]*>/i.test(text)) return "HTML";
  return undefined;
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escape user-supplied values so HTML replies never break Telegram parsing. */
function safeVars(vars: Record<string, string>, mode: string | undefined) {
  if (mode !== "HTML") return vars;
  return {
    ...vars,
    text: escapeHtml(vars.text ?? ""),
    first_name: escapeHtml(vars.first_name ?? ""),
    last_name: escapeHtml(vars.last_name ?? ""),
    username: escapeHtml(vars.username ?? ""),
    chat_title: escapeHtml(vars.chat_title ?? ""),
    bot_name: escapeHtml(vars.bot_name ?? ""),
  };
}

function varsFor(bot: Bot, update: TgUpdate, text: string, startedMs: number) {
  const m = update.message;
  const u = (m?.from ?? update.callback_query?.from ?? update.inline_query?.from) as
    | { id: number; first_name?: string; last_name?: string; username?: string }
    | undefined;
  return {
    first_name: u?.first_name ?? "there",
    last_name: u?.last_name ?? "",
    username: u?.username ? `@${u.username}` : "unknown",
    chat_id: String(m?.chat.id ?? update.callback_query?.message?.chat.id ?? u?.id ?? ""),
    chat_title: m?.chat.title ?? "private chat",
    user_id: String(u?.id ?? ""),
    text,
    time: new Date().toLocaleString("en-GB", { timeZone: "UTC", hour12: false }) + " UTC",
    bot_name: bot.telegram.username ? `@${bot.telegram.username}` : bot.name,
    updates: String(bot.telegram.updates + 1),
    engine_uptime: `${Math.max(1, Math.round((Date.now() - startedMs) / 1000))}s`,
    latency: "0",
  } as Record<string, string>;
}

function pickReply(bot: Bot, text: string): { reply: string | null; kind: string } {
  const behaviour: Behaviour = bot.behaviour;
  const trimmed = (text ?? "").trim();

  if (trimmed.startsWith("/")) {
    const cmd = trimmed.slice(1).split(/\s+/)[0].split("@")[0].toLowerCase();
    const found = behaviour.commands.find((c) => c.cmd === cmd);
    if (found) return { reply: found.reply, kind: `command /${cmd}` };
    return { reply: behaviour.fallback, kind: `unknown command /${cmd}` };
  }
  if (behaviour.echo) return { reply: behaviour.echo, kind: "echo" };
  if (behaviour.fallback) return { reply: behaviour.fallback, kind: "fallback" };
  return { reply: null, kind: "ignored" };
}

export async function POST(req: Request, ctx: { params: Promise<{ botId: string }> }) {
  const { botId } = await ctx.params;
  const started = Date.now();

  let bot = await getBot(botId);
  if (!bot) {
    // Ephemeral storage can drop the record after a cold start, while Telegram
    // keeps delivering to this URL. The sealed token rides in ?d=, so the bot
    // keeps answering with the engine defaults instead of going silent.
    const sealed = new URL(req.url).searchParams.get("d");
    const token = sealed ? open(sealed) : null;
    if (!token) {
      // 200 so Telegram does not retry forever against a deleted bot
      return Response.json({ ok: true, ignored: "unknown bot" });
    }
    bot = recoverBot(botId, token);
    await appendLogs(bot.id, [
      { stream: "system", message: "state restored from webhook URL · engine defaults active" },
    ]);
  }

  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (bot.webhookSecret && secret !== bot.webhookSecret) {
    return Response.json({ ok: false, error: "bad secret" }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return Response.json({ ok: true, ignored: "bad json" });
  }

  const token = bot.tokenEnc ? open(bot.tokenEnc) : null;
  if (!token) return Response.json({ ok: true, ignored: "no token" });

  const logs: Array<{ stream: "update" | "reply" | "system" | "error"; message: string }> = [];
  let replied = false;

  // ---------------------------------------------------------- callback query
  if (update.callback_query) {
    const cq = update.callback_query;
    const data = cq.data ?? "";
    const button = bot.behaviour.buttons.find((b) => b.data === data);
    const vars = varsFor(bot, update, data, started);
    const cbMode = parseModeFor(bot, button?.reply ?? "✅ <b>{label}</b> selected.");
    const cbVars = safeVars(vars, cbMode);
    const text = button?.reply
      ? renderTemplate(button.reply, cbVars)
      : renderTemplate("✅ <b>{label}</b> selected.", {
          ...cbVars,
          label: cbMode === "HTML" ? escapeHtml(button?.label ?? data) : button?.label ?? data,
        });

    logs.push({ stream: "update", message: `callback “${data}” from ${vars.username} (chat ${vars.chat_id})` });
    await callTelegram(token, "answerCallbackQuery", { callback_query_id: cq.id, text: "✓" });
    const sent = await sendMessage(token, vars.chat_id, text, cbMode ? { parse_mode: cbMode } : {});
    replied = sent.ok;
    logs.push(
      sent.ok
        ? { stream: "reply", message: `→ ${text.replace(/\n/g, " ⏎ ").slice(0, 160)}` }
        : { stream: "error", message: `sendMessage failed · ${sent.description}` }
    );
    await finish(bot, logs, replied, sent.ok ? null : sent.description, update);
    return Response.json({ ok: true, method: "answerCallbackQuery" });
  }

  // ---------------------------------------------------------- inline query
  if (update.inline_query) {
    const iq = update.inline_query;
    const start = bot.behaviour.commands.find((c) => c.cmd === "start");
    const vars = varsFor(bot, update, iq.query, started);
    const result = await callTelegram(token, "answerInlineQuery", {
      inline_query_id: iq.id,
      cache_time: 5,
      results: [
        {
          type: "article",
          id: "botforge-help",
          title: bot.name,
          description: start ? renderTemplate(start.reply, vars).slice(0, 100) : "Powered by BotForge",
          input_message_content: {
            message_text: start ? renderTemplate(start.reply, vars) : "Powered by BotForge",
            parse_mode: bot.behaviour.parseMode ?? undefined,
          },
        },
      ],
    });
    logs.push({ stream: "update", message: `inline query “${iq.query}” from ${vars.username}` });
    logs.push({ stream: "reply", message: result.ok ? "→ inline result served" : `inline failed · ${result.description}` });
    await finish(bot, logs, result.ok, result.ok ? null : result.description, update);
    return Response.json({ ok: true, method: "answerInlineQuery" });
  }

  // ---------------------------------------------------------------- message
  const message = update.message;
  if (!message) {
    await finish(bot, [{ stream: "system", message: `update ${update.update_id} · no handler for this type` }], false, null, update);
    return Response.json({ ok: true, ignored: "unsupported update" });
  }

  const text = message.text ?? "";
  const vars = varsFor(bot, update, text, started);
  logs.push({
    stream: "update",
    message: text
      ? `“${text.slice(0, 120)}” from ${vars.username} (${vars.first_name}) · chat ${vars.chat_id}`
      : `non-text message from ${vars.username} · chat ${vars.chat_id}`,
  });

  if (!text) {
    const sent = await sendMessage(token, vars.chat_id, "I can only read text messages right now 🙂");
    replied = sent.ok;
    logs.push({ stream: sent.ok ? "reply" : "error", message: sent.ok ? "→ asked for text" : `failed · ${sent.description}` });
    await finish(bot, logs, replied, sent.ok ? null : sent.description, update);
    return Response.json({ ok: true });
  }

  const { reply, kind } = pickReply(bot, text);
  logs.push({ stream: "system", message: `engine · ${kind}` });

  if (!reply) {
    logs.push({ stream: "system", message: "no reply configured for this message" });
    await finish(bot, logs, false, null, update);
    return Response.json({ ok: true, replied: false });
  }

  const mode = parseModeFor(bot, reply);
  const rendered = renderTemplate(reply, safeVars(vars, mode));
  const extra: Record<string, unknown> = {};
  if (mode) extra.parse_mode = mode;

  // attach inline keyboard to /start when the code declared buttons
  const isStart = text.trim().toLowerCase().startsWith("/start");
  if (isStart && bot.behaviour.buttons.length) {
    extra.reply_markup = {
      inline_keyboard: bot.behaviour.buttons.slice(0, 8).reduce<{ text: string; callback_data: string }[][]>(
        (rows, b, i) => {
          if (i % 2 === 0) rows.push([]);
          rows[rows.length - 1].push({ text: b.label, callback_data: b.data });
          return rows;
        },
        []
      ),
    };
  }

  const sent = await sendMessage(token, vars.chat_id, rendered, extra);
  replied = sent.ok;
  logs.push(
    sent.ok
      ? { stream: "reply", message: `→ ${rendered.replace(/\n/g, " ⏎ ").slice(0, 200)}` }
      : { stream: "error", message: `sendMessage failed · ${sent.description}` }
  );

  await finish(bot, logs, replied, sent.ok ? null : sent.description, update);
  return Response.json({ ok: true, replied });
}

async function finish(
  bot: Bot,
  logs: Array<{ stream: "update" | "reply" | "system" | "error"; message: string }>,
  replied: boolean,
  error: string | null | undefined,
  update: TgUpdate
) {
  bot.telegram.updates = (bot.telegram.updates ?? 0) + 1;
  if (replied) bot.telegram.replies = (bot.telegram.replies ?? 0) + 1;
  if (error) {
    bot.telegram.errors = (bot.telegram.errors ?? 0) + 1;
    bot.telegram.lastError = error;
  } else {
    bot.telegram.lastError = null;
  }
  bot.lastError = error ?? null;
  bot.telegram.lastUpdateAt = Date.now();
  bot.telegram.lastSyncAt = Date.now();
  if (bot.status === "draft" || bot.status === "deploying") bot.status = "live";
  bot.stats.uptimePct = Math.max(90, 100 - (bot.telegram.errors ?? 0) * 0.5);
  try {
    await saveBot(bot);
    await appendLogs(bot.id, logs);
  } catch {
    /* logging must never break the reply */
  }
  void update;
}

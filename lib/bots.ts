/**
 * Bot service layer — webhook engine edition.
 *
 * Registering with Telegram (setWebhook) is what makes a bot "deployed": from
 * that moment Telegram pushes every update to our serverless endpoint, which
 * answers instantly. No process, no runner, no VPS — the bot is online 24/7 by
 * construction, and Telegram retries updates if an instance is cold.
 */
import crypto from "node:crypto";
import { db, uid } from "./db";
import { compileBehaviour } from "./behavior";
import { parseRequirements } from "./pyreqs";
import {
  deleteWebhook,
  getMe,
  getWebhookInfo,
  maskToken,
  open,
  seal,
  setWebhook,
  webhookUrl,
  isValidToken,
} from "./telegram";
import type { Bot, BotEvent, BotStatus, LogLine, User } from "./types";

const LOG_CAP = 600;

export interface LogDoc {
  id: string;
  lines: LogLine[];
  nextSeq: number;
}

export const asBot = (doc: Record<string, unknown> | null): Bot | null =>
  (doc as unknown as Bot) ?? null;

/** Strip everything the browser must never see. */
export function publicBot(bot: Bot) {
  const { tokenEnc, webhookSecret, ...rest } = bot;
  return {
    ...rest,
    hasToken: Boolean(tokenEnc),
    webhookUrl: bot.telegram?.webhookUrl ?? null,
  };
}

export async function listBots(userId: string): Promise<Bot[]> {
  const all = (await db.all("bots")) as unknown as Bot[];
  return all.filter((b) => b.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getBot(id: string): Promise<Bot | null> {
  return asBot(await db.get("bots", id));
}

export async function saveBot(bot: Bot): Promise<Bot> {
  bot.updatedAt = Date.now();
  await db.put("bots", bot.id, bot as unknown as Record<string, unknown>);
  return bot;
}

export function addEvent(bot: Bot, type: BotEvent["type"], message: string) {
  bot.events = [{ id: uid("e_"), type, message, ts: Date.now() }, ...(bot.events ?? [])].slice(0, 60);
}

/* ------------------------------------------------------------------ logs */

export async function getLogDoc(botId: string): Promise<LogDoc> {
  const doc = (await db.get("logs", botId)) as unknown as LogDoc | null;
  return doc ?? { id: botId, lines: [], nextSeq: 1 };
}

export async function putLogDoc(doc: LogDoc) {
  if (doc.lines.length > LOG_CAP) doc.lines = doc.lines.slice(-LOG_CAP);
  await db.put("logs", doc.id, doc as unknown as Record<string, unknown>);
}

export async function appendLog(
  botId: string,
  stream: LogLine["stream"],
  message: string,
  ts = Date.now()
) {
  const doc = await getLogDoc(botId);
  doc.lines.push({ seq: doc.nextSeq++, stream, message, ts });
  await putLogDoc(doc);
}

export async function appendLogs(botId: string, entries: Array<Pick<LogLine, "stream" | "message">>) {
  const doc = await getLogDoc(botId);
  for (const e of entries) {
    doc.lines.push({ seq: doc.nextSeq++, stream: e.stream, message: e.message, ts: Date.now() });
  }
  await putLogDoc(doc);
}

export async function clearLogs(botId: string) {
  const doc = await getLogDoc(botId);
  await putLogDoc({ id: botId, lines: [], nextSeq: doc.nextSeq + 1 });
}

export async function readLogs(bot: Bot, after = 0) {
  const doc = await getLogDoc(bot.id);
  const lines = doc.lines.filter((l) => l.seq > after).slice(-400);
  return { lines, nextSeq: doc.nextSeq - 1, status: bot.status, generated: lines.length };
}

/* --------------------------------------------------------------- create */

export interface DeployInput {
  name: string;
  entry: string;
  files: { path: string; content: string }[];
  requirements: string;
  env: Record<string, string>;
  framework: string;
  frameworkId: string;
  token?: string | null;
}

export async function createBot(userId: string, input: DeployInput): Promise<Bot> {
  const now = Date.now();
  const source =
    input.files.find((f) => f.path === input.entry)?.content ?? input.files[0]?.content ?? "";
  const behaviour = compileBehaviour(source);
  const token = input.token?.trim() || null;

  const bot: Bot = {
    id: uid("b_"),
    userId,
    name: input.name || "untitled-bot",
    path: input.entry,
    content: source,
    entry: input.entry,
    files: input.files,
    requirements: input.requirements,
    env: input.env,
    status: "draft",
    desired: "live",
    tokenMasked: token ? maskToken(token) : null,
    tokenEnc: token ? seal(token) : null,
    webhookSecret: null,
    framework: input.framework,
    frameworkId: input.frameworkId,
    behaviour,
    telegram: {
      username: null,
      botId: null,
      firstName: null,
      webhookUrl: null,
      webhookOk: false,
      pendingUpdates: 0,
      lastError: null,
      lastSyncAt: null,
      lastUpdateAt: null,
      updates: 0,
      replies: 0,
      errors: 0,
    },
    autoRestart: true,
    restartCount: 0,
    lastError: null,
    startedAt: null,
    stoppedAt: null,
    createdAt: now,
    updatedAt: now,
    events: [],
    stats: { uptimePct: 100, cpu: 0, memMB: 0 },
  };

  addEvent(bot, "create", `Bot created · ${input.framework}`);
  await saveBot(bot);
  return bot;
}

/* ------------------------------------------------------------ lifecycle */

/** Extract a token the user hard-coded in the source (fallback). */
export function tokenFromSource(source: string): string | null {
  const m = source.match(/\b(\d{8,12}:[A-Za-z0-9_-]{30,45})\b/);
  return m ? m[1] : null;
}

export async function goLive(user: User, bot: Bot, opts: { restart?: boolean } = {}): Promise<Bot> {
  const token =
    (bot.tokenEnc ? open(bot.tokenEnc) : null) ||
    bot.env?.BOT_TOKEN?.trim() ||
    bot.env?.TOKEN?.trim() ||
    tokenFromSource(bot.content) ||
    "";

  if (!token) {
    bot.status = "draft";
    bot.lastError = "Add your bot token (from @BotFather) to go live.";
    addEvent(bot, "error", bot.lastError);
    await saveBot(bot);
    return bot;
  }
  if (!isValidToken(token)) {
    bot.status = "error";
    bot.lastError = "That does not look like a bot token (expected 123456789:AA…)";
    addEvent(bot, "error", bot.lastError);
    await saveBot(bot);
    return bot;
  }

  bot.status = "deploying";
  bot.desired = "live";
  bot.tokenEnc = seal(token);
  bot.tokenMasked = maskToken(token);
  await saveBot(bot);

  // 1. who am I?
  const me = await getMe(token);
  if (!me.ok || !me.result) {
    bot.status = "error";
    bot.lastError = `Telegram rejected the token: ${me.description ?? "unauthorised"}`;
    bot.telegram.lastError = bot.lastError;
    addEvent(bot, "error", bot.lastError);
    await saveBot(bot);
    await appendLogs(bot.id, [
      { stream: "error", message: `getMe failed · ${me.description ?? "unauthorised"}` },
      { stream: "system", message: "check the token in BotFather → API Token" },
    ]);
    return bot;
  }

  bot.telegram.botId = me.result.id;
  bot.telegram.username = me.result.username ?? null;
  bot.telegram.firstName = me.result.first_name ?? null;

  // 2. webhook + secret
  const secret = bot.webhookSecret ?? crypto.randomBytes(24).toString("base64url");
  bot.webhookSecret = secret;
  const url = webhookUrl(bot.id, bot.tokenEnc);

  const hook = await setWebhook(token, url, secret);
  const info = await getWebhookInfo(token);

  if (!hook.ok) {
    bot.status = "error";
    bot.lastError = `setWebhook failed: ${hook.description ?? "unknown error"}`;
    bot.telegram.lastError = bot.lastError;
    addEvent(bot, "error", bot.lastError);
    await saveBot(bot);
    await appendLogs(bot.id, [{ stream: "error", message: bot.lastError }]);
    return bot;
  }

  bot.telegram.webhookUrl = info.result?.url ?? url;
  bot.telegram.webhookOk = Boolean(info.result?.url);
  bot.telegram.pendingUpdates = info.result?.pending_update_count ?? 0;
  bot.telegram.lastError = info.result?.last_error_message ?? null;
  bot.telegram.lastSyncAt = Date.now();
  bot.status = "live";
  bot.lastError = null;
  bot.startedAt = bot.startedAt ?? Date.now();
  bot.stoppedAt = null;
  if (opts.restart) bot.restartCount += 1;

  addEvent(
    bot,
    opts.restart ? "restart" : "deploy",
    `Webhook registered · @${bot.telegram.username ?? bot.telegram.botId} is live`
  );
  await saveBot(bot);

  const cmds = bot.behaviour.commands.filter((c) => c.source === "code").map((c) => "/" + c.cmd);
  await appendLogs(bot.id, [
    { stream: "system", message: `getMe → @${bot.telegram.username ?? bot.telegram.botId} (id ${bot.telegram.botId})` },
    { stream: "system", message: `setWebhook → ${url.replace(/\?d=[^&]+/, "?d=•••")}` },
    { stream: "system", message: `webhook ok · pending updates: ${bot.telegram.pendingUpdates}` },
    {
      stream: "system",
      message: cmds.length
        ? `compiled handlers · ${cmds.join(" ")}`
        : `no user handlers found · engine commands registered (${bot.behaviour.commands.map((c) => "/" + c.cmd).join(" ")})`,
    },
    { stream: "system", message: `engine armed · 24/7 webhook mode · send a message to the bot now` },
  ]);

  return bot;
}

export async function pauseBot(user: User, bot: Bot, reason = "Paused by user"): Promise<Bot> {
  const token = bot.tokenEnc ? open(bot.tokenEnc) : null;
  if (token) await deleteWebhook(token);
  bot.status = "paused";
  bot.desired = "paused";
  bot.stoppedAt = Date.now();
  addEvent(bot, "stop", reason);
  await saveBot(bot);
  await appendLogs(bot.id, [
    { stream: "system", message: `deleteWebhook · telegram will stop delivering updates` },
  ]);
  return bot;
}

export async function restartBot(user: User, bot: Bot): Promise<Bot> {
  bot.restartCount += 1;
  addEvent(bot, "restart", `Manual restart #${bot.restartCount}`);
  await saveBot(bot);
  return goLive(user, bot, { restart: true });
}

export async function deleteBot(bot: Bot) {
  const token = bot.tokenEnc ? open(bot.tokenEnc) : null;
  if (token) await deleteWebhook(token);
  await db.del("bots", bot.id);
  await db.del("logs", bot.id);
}

/** Ask Telegram for the current webhook health (throttled to 30s). */
export async function syncTelegram(bot: Bot, force = false): Promise<Bot> {
  if (!bot.tokenEnc) return bot;
  const last = bot.telegram?.lastSyncAt ?? 0;
  if (!force && Date.now() - last < 30_000) return bot;
  const token = open(bot.tokenEnc);
  if (!token) return bot;

  const info = await getWebhookInfo(token);
  bot.telegram.lastSyncAt = Date.now();
  if (!info.ok || !info.result) {
    bot.telegram.lastError = info.description ?? "telegram unreachable";
    if (bot.status === "live") bot.status = "error";
    bot.lastError = bot.telegram.lastError;
    await saveBot(bot);
    return bot;
  }
  const r = info.result;
  bot.telegram.pendingUpdates = r.pending_update_count ?? 0;
  bot.telegram.lastError = r.last_error_message ?? null;
  bot.telegram.webhookOk = Boolean(r.url);
  bot.telegram.webhookUrl = r.url || bot.telegram.webhookUrl;
  if (bot.status !== "paused" && bot.status !== "draft") {
    bot.status = r.url ? "live" : "paused";
  }
  if (r.last_error_message) bot.lastError = r.last_error_message;
  else if (bot.status === "live") bot.lastError = null;
  await saveBot(bot);
  return bot;
}

const LEGACY_STATUS: Record<string, BotStatus> = {
  running: "live",
  installing: "deploying",
  stopped: "paused",
  crashed: "error",
};

let normalized = false;

/**
 * One-time migration for bots written before the webhook rewrite (they carried
 * runner-era statuses such as `running`/`crashed`). Runs once per instance.
 */
export async function normalizeLegacyBots() {
  if (normalized) return;
  normalized = true;
  try {
    const all = (await db.all("bots")) as unknown as Bot[];
    for (const b of all) {
      const next = LEGACY_STATUS[b.status as string];
      const needsTelegram = !b.telegram;
      if (!next && !needsTelegram) continue;
      if (next) b.status = next;
      const defaults: Bot["telegram"] = {
        username: null,
        botId: null,
        firstName: null,
        webhookUrl: null,
        webhookOk: false,
        pendingUpdates: 0,
        lastError: null,
        lastSyncAt: null,
        lastUpdateAt: null,
        updates: 0,
        replies: 0,
        errors: 0,
      };
      b.telegram = Object.assign(defaults, b.telegram ?? {});
      b.desired = b.desired ?? (b.status === "paused" ? "paused" : "live");
      b.behaviour = b.behaviour ?? compileBehaviour(b.content ?? "");
      b.events = b.events ?? [];
      await db.put("bots", b.id, b as unknown as Record<string, unknown>);
    }
  } catch {
    normalized = false;
  }
}

export async function refreshStatuses(bots: Bot[]): Promise<Bot[]> {
  await normalizeLegacyBots();
  return Promise.all(
    bots.map(async (b) => {
      try {
        return b.status === "live" || b.status === "error" ? await syncTelegram(b) : b;
      } catch {
        return b;
      }
    })
  );
}

/**
 * Rebuild a minimal, working bot when the store no longer has the record but
 * Telegram still posts to the webhook (which happens on ephemeral storage after
 * a cold start). The token travels inside the webhook URL, sealed.
 */
export function recoverBot(botId: string, token: string): Bot {
  return {
    id: botId,
    userId: "recovered",
    name: "recovered-bot",
    path: "main.py",
    content: "",
    entry: "main.py",
    files: [],
    requirements: "",
    env: {},
    status: "live",
    desired: "live",
    tokenMasked: maskToken(token),
    tokenEnc: seal(token),
    webhookSecret: null,
    framework: "Webhook engine",
    frameworkId: "generic",
    behaviour: compileBehaviour(""),
    telegram: {
      username: null,
      botId: null,
      firstName: null,
      webhookUrl: null,
      webhookOk: true,
      pendingUpdates: 0,
      lastError: null,
      lastSyncAt: null,
      lastUpdateAt: null,
      updates: 0,
      replies: 0,
      errors: 0,
    },
    autoRestart: true,
    restartCount: 0,
    lastError: null,
    startedAt: Date.now(),
    stoppedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    events: [],
    stats: { uptimePct: 100, cpu: 0, memMB: 0 },
  };
}

export function uptimePct(bot: Bot): number {
  if (!bot.startedAt || bot.status === "paused" || bot.status === "draft") return 0;
  const failed = bot.telegram?.errors ?? 0;
  return Number(Math.max(90, 100 - failed * 0.5).toFixed(2));
}

export function statusLabel(status: BotStatus): string {
  return (
    { live: "LIVE", draft: "DRAFT", paused: "PAUSED", deploying: "DEPLOYING", error: "ERROR" }[status] ??
    status.toUpperCase()
  );
}

export { parseRequirements };

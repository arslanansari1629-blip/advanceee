/**
 * Bot service layer — the single place that knows how to turn a pasted script
 * into a supervised, always-on process, on a real runner or in preview mode.
 */
import { db, uid } from "./db";
import { extractCommands, parseRequirements } from "./pyreqs";
import { previewBootLog, previewStream, PREVIEW_STEP_MS } from "./preview";
import { runnerFetch, runnerTarget } from "./runner";
import type { Bot, BotEvent, LogLine, RunnerMode, User } from "./types";

type EventType = BotEvent["type"];

const LOG_CAP = 800;

export interface LogDoc {
  id: string;
  lines: LogLine[];
  nextSeq: number;
  genUntil: number;
}

export const asBot = (doc: Record<string, unknown> | null): Bot | null =>
  (doc as unknown as Bot) ?? null;

export async function listBots(userId: string): Promise<Bot[]> {
  const all = (await db.all("bots")) as unknown as Bot[];
  return all
    .filter((b) => b.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getBot(id: string): Promise<Bot | null> {
  return asBot(await db.get("bots", id));
}

export async function saveBot(bot: Bot): Promise<Bot> {
  bot.updatedAt = Date.now();
  await db.put("bots", bot.id, bot as unknown as Record<string, unknown>);
  return bot;
}

export function addEvent(bot: Bot, type: EventType, message: string) {
  bot.events = [
    { id: uid("e_"), type, message, ts: Date.now() },
    ...(bot.events ?? []),
  ].slice(0, 60);
}

/* ------------------------------------------------------------------ logs */

export async function getLogDoc(botId: string): Promise<LogDoc> {
  const doc = (await db.get("logs", botId)) as unknown as LogDoc | null;
  return doc ?? { id: botId, lines: [], nextSeq: 1, genUntil: 0 };
}

async function putLogDoc(doc: LogDoc) {
  if (doc.lines.length > LOG_CAP) doc.lines = doc.lines.slice(-LOG_CAP);
  await db.put("logs", doc.id, doc as unknown as Record<string, unknown>);
}

export async function appendSystemLog(botId: string, message: string, stream: LogLine["stream"] = "system") {
  const doc = await getLogDoc(botId);
  doc.lines.push({ seq: doc.nextSeq++, stream, message, ts: Date.now() });
  await putLogDoc(doc);
}

export async function clearLogs(botId: string) {
  const doc = await getLogDoc(botId);
  await putLogDoc({ ...doc, lines: [], genUntil: 0, nextSeq: doc.nextSeq + 1 });
}

/* -------------------------------------------------------------- profiles */

export function previewStats(bot: Bot) {
  const now = Date.now();
  if (bot.status !== "running" || !bot.startedAt) {
    return { cpu: 0, memMB: 0, uptimePct: bot.stats?.uptimePct ?? 100 };
  }
  const slot = Math.floor(now / 60_000) + (bot.id.charCodeAt(1) || 7);
  const p1 = Math.abs(Math.sin(slot * 1.7)) * 6 + 1.2;
  const p2 = 42 + Math.abs(Math.cos(slot * 0.9)) * 26;
  const uptimeMs = now - bot.startedAt;
  const crashes = bot.events?.filter((e) => e.type === "crash").length ?? 0;
  const up = crashes === 0 ? 100 : Math.max(90, 100 - crashes * 1.4);
  return {
    cpu: Number(p1.toFixed(2)),
    memMB: Number(p2.toFixed(1)),
    uptimePct: Number((uptimeMs > 0 ? up : 100).toFixed(2)),
  };
}

/* --------------------------------------------------------------- deploy */

export interface DeployInput {
  name: string;
  entry: string;
  files: { path: string; content: string }[];
  requirements: string;
  env: Record<string, string>;
  autoRestart: boolean;
  framework: string;
  frameworkId: string;
  tokenMasked: string | null;
  existing?: Bot;
}

export async function createBot(userId: string, input: DeployInput): Promise<Bot> {
  const now = Date.now();
  const bot: Bot = {
    id: uid("b_"),
    userId,
    name: input.name || "untitled-bot",
    path: input.entry,
    content: input.files.find((f) => f.path === input.entry)?.content ?? input.files[0]?.content ?? "",
    entry: input.entry,
    files: input.files,
    requirements: input.requirements,
    env: input.env,
    status: "stopped",
    desired: "stopped",
    installed: [],
    installLog: "",
    installState: "idle",
    restartCount: 0,
    autoRestart: input.autoRestart,
    crashLoop: false,
    lastError: null,
    tokenMasked: input.tokenMasked,
    framework: input.framework,
    frameworkId: input.frameworkId ?? "generic",
    mode: "preview",
    startedAt: null,
    stoppedAt: null,
    createdAt: now,
    updatedAt: now,
    events: [],
    stats: { cpu: 0, memMB: 0, uptimePct: 100, messagesProcessed: 0 },
    previewSeed: 1 + Math.floor(Math.random() * 99_000),
    previewCommands: extractCommands(input.files.map((f) => f.content).join("\n")),
  };
  addEvent(bot, "create", `Bot created · ${input.framework}`);
  await saveBot(bot);
  return bot;
}

/** Boot the bot: on a real runner when one is attached, otherwise preview. */
export async function deployBot(user: User, bot: Bot, opts: { restart?: boolean } = {}): Promise<Bot> {
  const target = runnerTarget(user);
  const reqs = parseRequirements(bot.requirements);
  bot.mode = target.url ? "runner" : "preview";

  bot.status = "installing";
  bot.installState = "installing";
  bot.lastError = null;
  bot.crashLoop = false;
  bot.desired = "running";
  bot.startedAt = Date.now();
  bot.stoppedAt = null;
  bot.installed = reqs;
  addEvent(bot, opts.restart ? "restart" : "deploy", `Deploy started · ${reqs.length} requirement(s) · ${bot.mode} mode`);
  await saveBot(bot);

  if (target.url) {
    try {
      const res = await runnerFetch<any>(
        target,
        "/bots",
        {
          method: "POST",
          body: JSON.stringify({
            id: bot.id,
            name: bot.name,
            files: bot.files,
            entry: bot.entry,
            requirements: bot.requirements,
            env: bot.env,
            autoRestart: bot.autoRestart,
            restart: Boolean(opts.restart),
          }),
        },
        25_000
      );
      // The runner installs asynchronously; the log poller promotes this to
      // "running" as soon as the process is actually alive.
      bot.status = res?.status === "running" ? "running" : "installing";
      bot.installState = bot.status === "running" ? "installed" : "installing";
      bot.installLog = res?.installLog ?? "";
      bot.installed = res?.installed ?? reqs;
      addEvent(bot, "install", `requirements dispatched to runner · ${reqs.length} package(s)`);
      if (bot.status === "running") addEvent(bot, "start", "Process spawned on runner · 24/7 supervision armed");
      await saveBot(bot);
      return bot;
    } catch (err: any) {
      bot.status = "crashed";
      bot.installState = "failed";
      bot.lastError = err?.message ?? "runner unreachable";
      addEvent(bot, "crash", `Runner error: ${bot.lastError}`);
      await saveBot(bot);
      await appendSystemLog(bot.id, `runner error: ${bot.lastError}`, "stderr");
      return bot;
    }
  }

  // ---- preview mode: deterministic, clearly labelled simulated gateway
  bot.installState = "installed";
  const boot = previewBootLog({
    profile: bot.frameworkId ?? "generic",
    requirements: reqs,
    maskedToken: bot.tokenMasked,
    commands: bot.previewCommands,
    entry: bot.entry,
    startSeq: 1,
    startedAt: bot.startedAt!,
  });
  const logDoc: LogDoc = {
    id: bot.id,
    lines: boot,
    nextSeq: boot.length + 1,
    genUntil: 0,
  };
  await putLogDoc(logDoc);
  bot.status = "running";
  addEvent(bot, "install", `pip install completed · ${reqs.length} packages resolved from cache`);
  addEvent(bot, "start", "Bot is live · supervised poller attached");
  await saveBot(bot);
  return bot;
}

export async function stopBot(user: User, bot: Bot, reason = "Stopped by user"): Promise<Bot> {
  const target = runnerTarget(user);
  bot.desired = "stopped";
  bot.stoppedAt = Date.now();
  if (target.url && bot.mode === "runner") {
    try {
      await runnerFetch(target, `/bots/${bot.id}/stop`, { method: "POST" }, 10_000);
    } catch {
      /* runner may already be gone — status below is still correct */
    }
  }
  bot.status = "stopped";
  addEvent(bot, "stop", reason);
  await saveBot(bot);
  await appendSystemLog(bot.id, `process stopped · ${reason}`);
  return bot;
}

export async function restartBot(user: User, bot: Bot): Promise<Bot> {
  bot.restartCount += 1;
  addEvent(bot, "restart", `Manual restart #${bot.restartCount}`);
  await saveBot(bot);
  return deployBot(user, bot, { restart: true });
}

export async function deleteBot(botId: string) {
  await db.del("bots", botId);
  await db.del("logs", botId);
}

/* ------------------------------------------------------------- log reads */

export interface LogPage {
  lines: LogLine[];
  nextSeq: number;
  status: Bot["status"];
  generated: number;
}

/**
 * Advance preview generation up to `now` and return the tail of the buffer,
 * or proxy the runner's ring buffer in runner mode.
 */
export async function readLogs(user: User, bot: Bot, after = 0): Promise<LogPage> {
  const target = runnerTarget(user);

  if (target.url && bot.mode === "runner") {
    try {
      const res = await runnerFetch<any>(target, `/bots/${bot.id}/logs?after=${after}`, { method: "GET" }, 8000);
      if (res?.status && res.status !== bot.status) {
        bot.status = res.status;
        if (res.status === "crashed" && res.exitCode !== undefined) {
          bot.lastError = res.error ?? `exited with code ${res.exitCode}`;
          addEvent(bot, "crash", `Process exited (${res.exitCode}) — auto-restart #${bot.restartCount}`);
          if (bot.autoRestart) bot.restartCount += 1;
        }
        await saveBot(bot);
      }
      return {
        lines: (res?.lines ?? []) as LogLine[],
        nextSeq: res?.nextSeq ?? after,
        status: bot.status,
        generated: 0,
      };
    } catch {
      /* fall through to stored logs */
    }
  }

  const doc = await getLogDoc(bot.id);
  let generated = 0;

  if (bot.status === "running" && bot.startedAt) {
    const elapsed = Date.now() - bot.startedAt;
    if (elapsed > doc.genUntil + PREVIEW_STEP_MS) {
      const fresh = previewStream({
        profile: bot.frameworkId ?? "generic",
        seed: bot.previewSeed ?? 1,
        maskedToken: bot.tokenMasked,
        commands: bot.previewCommands,
        entry: bot.entry,
        requirements: parseRequirements(bot.requirements),
        fromElapsed: doc.genUntil,
        toElapsed: elapsed,
        startSeq: doc.nextSeq,
        startedAt: bot.startedAt,
      });
      if (fresh.length) {
        doc.lines.push(...fresh);
        doc.nextSeq += fresh.length;
        generated = fresh.length;
      }
      doc.genUntil = elapsed;
      await putLogDoc(doc);
    }
  }

  const lines = doc.lines.filter((l) => l.seq > after).slice(-400);
  return { lines, nextSeq: doc.nextSeq - 1, status: bot.status, generated };
}

/** Cheap status refresh used by dashboards. */
export async function refreshStatuses(user: User, bots: Bot[]): Promise<Bot[]> {
  const target = runnerTarget(user);
  if (!target.url) {
    return bots.map((b) => {
      const s = previewStats(b);
      return { ...b, stats: { ...b.stats, ...s } };
    });
  }
  return Promise.all(
    bots.map(async (b) => {
      if (b.mode !== "runner" || b.status !== "running") return b;
      try {
        const res = await runnerFetch<any>(target, `/bots/${b.id}/status`, { method: "GET" }, 4000);
        if (res?.status && res.status !== b.status) {
          b.status = res.status;
          await saveBot(b);
        }
        return { ...b, stats: { ...b.stats, cpu: res?.cpu ?? 0, memMB: res?.memMB ?? 0 } };
      } catch {
        return b;
      }
    })
  );
}

export const RUNNER_MODE_LABEL: Record<RunnerMode, string> = {
  runner: "Runner",
  preview: "Preview",
};

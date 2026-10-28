import { createUser, findByEmail, hashPassword } from "./auth";
import { db } from "./db";
import { addEvent, previewStats } from "./bots";
import { parseRequirements } from "./pyreqs";
import { previewBootLog, previewStream, PREVIEW_STEP_MS } from "./preview";
import type { Bot, LogLine } from "./types";

const SEED_VERSION = 3;
export const DEMO_EMAIL = "demo@botforge.dev";
export const DEMO_PASSWORD = "botforge123";

interface SeedBot {
  id: string;
  name: string;
  template: string;
  framework: string;
  frameworkId: string;
  requirements: string;
  status: Bot["status"];
  startedMinutesAgo: number;
  restartCount: number;
  entry?: string;
  files?: { path: string; content: string }[];
  env?: Record<string, string>;
  tokenMasked?: string;
  crash?: string[];
}

function mkBot(userId: string, s: SeedBot): Bot {
  const now = Date.now();
  const startedAt = s.startedMinutesAgo ? now - s.startedMinutesAgo * 60_000 : null;
  const bot: Bot = {
    id: s.id,
    userId,
    name: s.name,
    path: s.entry ?? "main.py",
    content: s.files?.[0]?.content ?? "",
    entry: s.entry ?? "main.py",
    files: s.files ?? [{ path: "main.py", content: "" }],
    requirements: s.requirements,
    env: s.env ?? { BOT_TOKEN: "" },
    status: s.status,
    desired: s.status === "running" ? "running" : "stopped",
    installed: parseRequirements(s.requirements),
    installLog: "",
    installState: "installed",
    restartCount: s.restartCount,
    autoRestart: true,
    crashLoop: false,
    lastError: s.crash ? s.crash[s.crash.length - 1] : null,
    tokenMasked: s.tokenMasked ?? "7712345678:AAHx••••••9fQ",
    framework: s.framework,
    frameworkId: s.frameworkId,
    mode: "preview",
    startedAt,
    stoppedAt: s.status === "running" ? null : now - 1000 * 60 * 12,
    createdAt: now - (s.startedMinutesAgo + 90) * 60_000,
    updatedAt: now,
    events: [],
    stats: { cpu: 0, memMB: 0, uptimePct: 100, messagesProcessed: 0 },
    previewSeed: Number(s.id.replace(/\D/g, "").slice(-4) || 4242),
  };

  addEvent(bot, "create", "Bot created from template");
  addEvent(bot, "install", `pip install completed · ${bot.installed.length} packages`);
  addEvent(bot, "deploy", `Deployed · ${s.framework}`);
  if (s.status === "running") addEvent(bot, "start", "Supervisor armed · 24/7 keepalive");
  if (s.status === "stopped") addEvent(bot, "stop", "Stopped by user");
  if (s.status === "crashed") {
    addEvent(bot, "crash", "Process exited with code 1 — traceback captured");
    if (s.restartCount > 0) addEvent(bot, "restart", `Auto-restart attempt #${s.restartCount}`);
  }
  bot.stats = { ...bot.stats, ...previewStats(bot) };
  return bot;
}

function buildLogs(bot: Bot, crash?: string[]): LogLine[] {
  if (bot.status !== "running" || !bot.startedAt) {
    const boot = previewBootLog({
      profile: bot.frameworkId,
      requirements: bot.installed,
      maskedToken: bot.tokenMasked,
      startSeq: 1,
      startedAt: bot.startedAt ?? Date.now() - 3_600_000,
    });
    const tail = previewStream({
      profile: bot.frameworkId,
      seed: bot.previewSeed ?? 7,
      maskedToken: bot.tokenMasked,
      requirements: bot.installed,
      fromElapsed: 0,
      toElapsed: 120_000,
      startSeq: boot.length + 1,
      startedAt: bot.startedAt ?? Date.now() - 3_600_000,
    });
    const lines = [...boot, ...tail];
    if (crash) {
      let seq = lines.length + 1;
      const t = Date.now() - 9000;
      crash.forEach((message, i) =>
        lines.push({ seq: seq++, stream: "stderr", message, ts: t + i * 40 })
      );
      lines.push({
        seq: seq++,
        stream: "system",
        message: "supervisor · process exited (code 1) · auto-restart disabled after 3 crashes in 60s",
        ts: Date.now() - 8000,
      });
    }
    return lines;
  }

  const elapsed = Date.now() - bot.startedAt;
  const boot = previewBootLog({
    profile: bot.frameworkId,
    requirements: bot.installed,
    maskedToken: bot.tokenMasked,
    startSeq: 1,
    startedAt: bot.startedAt,
  });
  const from = Math.max(0, elapsed - 130_000);
  const stream = previewStream({
    profile: bot.frameworkId,
    seed: bot.previewSeed ?? 7,
    maskedToken: bot.tokenMasked,
    requirements: bot.installed,
    fromElapsed: Math.floor(from / PREVIEW_STEP_MS) * PREVIEW_STEP_MS,
    toElapsed: elapsed,
    startSeq: boot.length + 1,
    startedAt: bot.startedAt,
  });
  return [...boot, ...stream].slice(-320);
}

const SEED_BOTS: SeedBot[] = [
  {
    id: "seed-echo-01",
    name: "echo-bot",
    template: "ptb-echo",
    framework: "python-telegram-bot v21+ (asyncio Application API)",
    frameworkId: "ptb-v21",
    requirements: "python-telegram-bot>=21.6\npython-dotenv",
    status: "running",
    startedMinutesAgo: 612,
    restartCount: 1,
  },
  {
    id: "seed-support-02",
    name: "support-desk",
    template: "telebot-simple",
    framework: "pyTelegramBotAPI (telebot)",
    frameworkId: "telebot",
    requirements: "pyTelegramBotAPI>=4.24\npython-dotenv",
    status: "running",
    startedMinutesAgo: 187,
    restartCount: 0,
  },
  {
    id: "seed-shop-03",
    name: "cafe-orders",
    template: "aiogram-shop",
    framework: "aiogram v3",
    frameworkId: "aiogram-v3",
    requirements: "aiogram>=3.15\naiosqlite",
    status: "running",
    startedMinutesAgo: 43,
    restartCount: 2,
  },
  {
    id: "seed-mirror-04",
    name: "channel-mirror",
    template: "pyrogram-userbot",
    framework: "Pyrogram (MTProto userbot)",
    frameworkId: "pyrogram",
    requirements: "pyrogram>=2.0.106\nTgCrypto",
    status: "stopped",
    startedMinutesAgo: 0,
    restartCount: 1,
    env: { API_ID: "", API_HASH: "", SESSION_STRING: "" },
    tokenMasked: "MTProto · api_id hidden",
  },
  {
    id: "seed-legacy-05",
    name: "legacy-shop",
    template: "telebot-simple",
    framework: "python-telegram-bot v13 (legacy Updater API)",
    frameworkId: "ptb-v13",
    requirements: "python-telegram-bot==13.15",
    status: "crashed",
    startedMinutesAgo: 9,
    restartCount: 3,
    crash: [
      "Traceback (most recent call last):",
      '  File "/work/main.py", line 14, in <module>',
      "    from telegram.ext import Updater, CommandHandler",
      "ImportError: cannot import name 'Updater' from 'telegram.ext'",
      "",
      "hint: this script targets python-telegram-bot 12.x",
      "hint: BotForge pinned python-telegram-bot==13.15 — remove the manual pin in requirements.txt",
    ],
  },
  {
    id: "seed-worker-06",
    name: "price-worker",
    template: "worker",
    framework: "Plain Python",
    frameworkId: "generic",
    requirements: "requests",
    status: "running",
    startedMinutesAgo: 1440,
    restartCount: 0,
    env: { INTERVAL: "60" },
    tokenMasked: null as unknown as string,
  },
];

let seeding: Promise<void> | null = null;

export function ensureSeed(): Promise<void> {
  if (!seeding) seeding = doSeed().catch(() => void (seeding = null));
  return seeding;
}

async function doSeed() {
  const meta = await db.get("meta", "seed");
  if (meta && (meta.version as number) >= SEED_VERSION) return;

  let user = await findByEmail(DEMO_EMAIL);
  if (!user) {
    user = await createUser(DEMO_EMAIL, DEMO_PASSWORD, "Arslan Ansari");
    user.plan = "founder";
    await db.put("users", user.id, user as unknown as Record<string, unknown>);
  }

  const { TEMPLATES } = await import("./templates");

  for (const spec of SEED_BOTS) {
    const tpl = TEMPLATES.find((t) => t.id === spec.template);
    spec.files = [
      { path: "main.py", content: tpl?.code ?? "# worker\nprint('hello')\n" },
    ];
    const bot = mkBot(user.id, spec);
    await db.put("bots", bot.id, bot as unknown as Record<string, unknown>);
    const lines = buildLogs(bot, spec.crash);
    await db.put("logs", bot.id, {
      id: bot.id,
      lines,
      nextSeq: lines.length + 1,
      genUntil: bot.status === "running" && bot.startedAt ? Date.now() - bot.startedAt : 0,
    } as unknown as Record<string, unknown>);
  }

  await db.put("meta", "seed", { id: "seed", version: SEED_VERSION, at: Date.now() });
}

export const seedCredentials = { email: DEMO_EMAIL, password: DEMO_PASSWORD };
export { hashPassword };

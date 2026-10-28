import { findUserByEmail, createUser } from "./auth-internal";
import { db } from "./db";
import { addEvent, putLogDoc, saveBot } from "./bots";
import { compileBehaviour } from "./behavior";
import { parseRequirements } from "./pyreqs";
import { seal } from "./telegram";
import { TEMPLATES } from "./templates";
import type { Bot } from "./types";

const SEED_VERSION = 8;
export const DEMO_EMAIL = "demo@botforge.dev";
export const DEMO_PASSWORD = "botforge123";

/**
 * The demo workspace ships with real bot *code* and real compiled behaviour.
 * Nothing is simulated: bots without a token sit in DRAFT, and a bot with the
 * demo's fake token shows the genuine error Telegram returns.
 */
interface SeedSpec {
  id: string;
  template: string;
  name: string;
  status: Bot["status"];
  token?: string;
  createdAtMinutesAgo: number;
  events?: Array<{ type: Bot["events"][number]["type"]; message: string; minutesAgo: number }>;
  telegram?: Partial<Bot["telegram"]>;
}

const SPECS: SeedSpec[] = [
  {
    id: "seed-echo-01",
    template: "ptb-echo",
    name: "echo-bot",
    status: "draft",
    createdAtMinutesAgo: 620,
    events: [
      { type: "create", message: "Bot created from template", minutesAgo: 620 },
      { type: "note", message: "Add your bot token to go live — webhook mode needs no server", minutesAgo: 610 },
    ],
  },
  {
    id: "seed-support-02",
    template: "telebot-simple",
    name: "support-desk",
    status: "draft",
    createdAtMinutesAgo: 300,
    events: [{ type: "create", message: "Bot created from template", minutesAgo: 300 }],
  },
  {
    id: "seed-shop-03",
    template: "aiogram-shop",
    name: "cafe-orders",
    status: "error",
    // a syntactically valid but non-existent token: Telegram really rejects it
    token: "7712345678:AAHfakeTokenForDemoPurposesOnly_0000000",
    createdAtMinutesAgo: 120,
    events: [
      { type: "create", message: "Bot created from template", minutesAgo: 120 },
      { type: "error", message: "Telegram rejected the token: Unauthorized", minutesAgo: 118 },
    ],
    telegram: { lastError: "Unauthorized", errors: 1 },
  },
  {
    id: "seed-menu-04",
    template: "telebot-buttons",
    name: "menu-bot",
    status: "draft",
    createdAtMinutesAgo: 90,
    events: [{ type: "create", message: "Bot created · pyTelegramBotAPI inline menu", minutesAgo: 90 }],
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

  const user = await createUser(DEMO_EMAIL, DEMO_PASSWORD, "Arslan Ansari", "founder");

  // Drop demo bots from older seed revisions so the workspace matches the
  // webhook model exactly (no leftover runner-era "running"/"crashed" rows).
  const wanted = new Set(SPECS.map((s) => s.id));
  for (const bot of (await db.all("bots")) as unknown as Bot[]) {
    if (bot.id.startsWith("seed-") && !wanted.has(bot.id)) {
      await db.del("bots", bot.id);
      await db.del("logs", bot.id);
    }
  }

  for (const spec of SPECS) {
    const tpl = TEMPLATES.find((t) => t.id === spec.template);
    const source = tpl?.code ?? "# empty\nprint('hi')\n";
    const createdAt = Date.now() - spec.createdAtMinutesAgo * 60_000;
    const token = spec.token ?? null;

    const bot: Bot = {
      id: spec.id,
      userId: user.id,
      name: spec.name,
      path: "main.py",
      content: source,
      entry: "main.py",
      files: [{ path: "main.py", content: source }],
      requirements: tpl?.requirements ?? parseRequirements("python-dotenv").join("\n"),
      env: token ? { BOT_TOKEN: "" } : { BOT_TOKEN: "" },
      status: spec.status,
      desired: "live",
      tokenMasked: token ? `7712345678:AAHf${"•".repeat(6)}000` : null,
      tokenEnc: token ? seal(token) : null,
      webhookSecret: null,
      framework: tpl?.framework ?? "Plain Python",
      frameworkId: "generic",
      behaviour: compileBehaviour(source),
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
        ...spec.telegram,
      },
      autoRestart: true,
      restartCount: 0,
      lastError: spec.telegram?.lastError ?? null,
      startedAt: null,
      stoppedAt: spec.status === "draft" ? null : createdAt + 60_000,
      createdAt,
      updatedAt: createdAt,
      events: [],
      stats: { uptimePct: spec.status === "live" ? 100 : 0, cpu: 0, memMB: 0 },
    };

    for (const e of (spec.events ?? []).slice().reverse()) {
      addEvent(bot, e.type, e.message);
      bot.events[0].ts = Date.now() - e.minutesAgo * 60_000;
    }

    await saveBot(bot);
    const logs =
      spec.status === "error"
        ? [
            { seq: 1, stream: "system" as const, message: "getMe → api.telegram.org", ts: createdAt },
            { seq: 2, stream: "error" as const, message: "getMe failed · Unauthorized", ts: createdAt + 500 },
            { seq: 3, stream: "system" as const, message: "check the token in @BotFather → API Token", ts: createdAt + 600 },
          ]
        : [
            { seq: 1, stream: "system" as const, message: "bot saved as draft", ts: createdAt },
            {
              seq: 2,
              stream: "system" as const,
              message: `${bot.behaviour.commands.length} command(s) compiled from your code · waiting for a bot token`,
              ts: createdAt + 200,
            },
            {
              seq: 3,
              stream: "system" as const,
              message: "add BOT_TOKEN and press Deploy — the webhook goes live instantly, no server needed",
              ts: createdAt + 400,
            },
          ];
    await putLogDoc({ id: bot.id, lines: logs, nextSeq: logs.length + 1 });
  }

  await db.put("meta", "seed", { id: "seed", version: SEED_VERSION, at: Date.now() });
}

export const seedCredentials = { email: DEMO_EMAIL, password: DEMO_PASSWORD };

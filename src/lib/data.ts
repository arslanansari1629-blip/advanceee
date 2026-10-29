import type {
  AuditEntry,
  Bot,
  BotStatus,
  Flag,
  Incident,
  Invoice,
  Library,
  LogLine,
  Plan,
  Service,
  Template,
  Ticket,
  User,
} from "./types";

/* ------------------------------------------------------------------ */
/* deterministic pseudo-random helpers                                 */
/* ------------------------------------------------------------------ */

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20261029);
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const float = (min: number, max: number, d = 1) => Number((rnd() * (max - min) + min).toFixed(d));
const chance = (p: number) => rnd() < p;
const iso = (daysAgo: number, hour = int(0, 23), minute = int(0, 59)) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, int(0, 59), 0);
  return d.toISOString();
};
const isoMinAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export const DEMO_NOW = new Date().toISOString();

/* ------------------------------------------------------------------ */
/* users                                                               */
/* ------------------------------------------------------------------ */

const people: [string, string, string, string, Plan, User["role"], string][] = [
  ["Arslan Ansari", "arslan@forge.dev", "@arslan", "Lucknow, IN", "scale", "owner", "#34e0a1"],
  ["Mira Okonkwo", "mira@tgbuilds.co", "@miraok", "Lagos, NG", "pro", "admin", "#8b7cff"],
  ["Dmitri Volkov", "dmitri@botship.ru", "@dmitriv", "Belgrade, RS", "pro", "member", "#4cc9f0"],
  ["Sana Iqbal", "sana@quickbots.pk", "@sanaiq", "Karachi, PK", "free", "member", "#f5b544"],
  ["Lucas Ferreira", "lucas@ferreirad.dev", "@lucash", "São Paulo, BR", "pro", "member", "#ff8a5c"],
  ["Anna Lindqvist", "anna@nordbot.se", "@annal", "Stockholm, SE", "scale", "admin", "#ff6fb5"],
  ["Kenji Tanaka", "kenji@tanaka.jp", "@kenjit", "Osaka, JP", "pro", "member", "#7dd3fc"],
  ["Fatima Al-Sayed", "fatima@dubai.ai", "@fatima", "Dubai, AE", "free", "member", "#a3e635"],
  ["Peter Nowak", "peter@nowak.dev", "@pnowak", "Kraków, PL", "pro", "member", "#c4b5fd"],
  ["Grace Mensah", "grace@accrabots.gh", "@gracem", "Accra, GH", "free", "member", "#fca5a5"],
  ["Rohit Sharma", "rohit@mumbaidev.in", "@rohits", "Mumbai, IN", "scale", "member", "#fcd34d"],
  ["Elena Petrova", "elena@petrova.io", "@elenap", "Sofia, BG", "pro", "member", "#5eead4"],
  ["Yusuf Demir", "yusuf@demir.tr", "@yusufd", "Istanbul, TR", "free", "member", "#fdba74"],
  ["Chen Wei", "chen@weilabs.cn", "@chenw", "Shenzhen, CN", "pro", "member", "#93c5fd"],
  ["Sofia Rossi", "sofia@rossi.it", "@sofiar", "Milan, IT", "free", "member", "#f9a8d4"],
  ["Noah Fischer", "noah@fischer.de", "@noahf", "Berlin, DE", "pro", "member", "#86efac"],
  ["Aisha Bello", "aisha@bellobot.ng", "@aishab", "Abuja, NG", "free", "viewer", "#fde68a"],
  ["Marco Silva", "marco@silva.pt", "@marcos", "Lisbon, PT", "pro", "member", "#67e8f9"],
  ["Priya Nair", "priya@nair.co", "@priyan", "Bengaluru, IN", "scale", "member", "#d8b4fe"],
  ["Omar Haddad", "omar@haddad.ma", "@omarh", "Casablanca, MA", "free", "member", "#fecaca"],
  ["Julia Kowalska", "julia@kowalska.pl", "@juliak", "Warsaw, PL", "pro", "member", "#a5b4fc"],
  ["Tariq Rahman", "tariq@rahman.bd", "@tariqr", "Dhaka, BD", "free", "member", "#bef264"],
  ["Emma Johansson", "emma@johansson.se", "@emmaj", "Malmö, SE", "pro", "member", "#f0abfc"],
  ["Daniel Kim", "daniel@kim.dev", "@danielk", "Seoul, KR", "free", "member", "#7dd3fc"],
  ["Zara Ahmed", "zara@ahmed.pk", "@zaraa", "Lahore, PK", "pro", "member", "#fdba74"],
  ["Ivan Horvat", "ivan@horvat.hr", "@ivanh", "Zagreb, HR", "free", "member", "#5eead4"],
];

export const users: User[] = people.map(([name, email, telegram, country, plan, role, color], i) => {
  const bots = plan === "scale" ? int(9, 22) : plan === "pro" ? int(3, 10) : int(1, 4);
  const updates = plan === "scale" ? int(180_000, 640_000) : plan === "pro" ? int(40_000, 190_000) : int(1_200, 28_000);
  return {
    id: `usr_${(i + 1).toString().padStart(4, "0")}`,
    name,
    email,
    telegram,
    plan,
    role,
    status: i === 16 ? "suspended" : i === 20 ? "invited" : "active",
    bots,
    updates,
    mrr: plan === "scale" ? 149 : plan === "pro" ? 29 : 0,
    joined: iso(int(4, 380)),
    lastSeen: isoMinAgo(int(1, 2400)),
    country,
    countryCode: country.split(", ")[1] ?? "US",
    color,
  };
});

/* ------------------------------------------------------------------ */
/* bots                                                                */
/* ------------------------------------------------------------------ */

const botNames: [string, string, Library, BotStatus][] = [
  ["Echo Bot", "forge_echo_bot", "python-telegram-bot", "live"],
  ["Price Radar", "price_radar_bot", "aiogram", "live"],
  ["SupportDesk", "supportdesk_bot", "python-telegram-bot", "live"],
  ["Meme Machine", "meme_machine_bot", "pyTelegramBotAPI", "live"],
  ["Crypto Ticker", "cryptoticker_bot", "aiogram", "live"],
  ["Shop Assistant", "shopassist_bot", "python-telegram-bot", "live"],
  ["Invoice Grabber", "invoicegrab_bot", "python-telegram-bot", "paused"],
  ["Quiz Master", "quizmaster_bot", "pyTelegramBotAPI", "live"],
  ["Weather Now", "weathernow_bot", "aiogram", "live"],
  ["Job Alerts IN", "jobalerts_in_bot", "python-telegram-bot", "live"],
  ["AI Summariser", "aisummarise_bot", "aiogram", "error"],
  ["Fitness Coach", "fitcoach_bot", "pyTelegramBotAPI", "live"],
  ["Sheet Sync", "sheetsync_bot", "python-telegram-bot", "live"],
  ["Cine Tickets", "cinetickets_bot", "aiogram", "live"],
  ["Blog Digest", "blogdigest_bot", "python-telegram-bot", "live"],
  ["Cricket Live", "cricketlive_bot", "aiogram", "live"],
  ["Lead Catcher", "leadcatcher_bot", "python-telegram-bot", "live"],
  ["Translate Hub", "translatehub_bot", "pyrogram", "paused"],
  ["PDF Toolkit", "pdftoolkit_bot", "python-telegram-bot", "live"],
  ["Daily Quotes", "dailyquotes_bot", "pyTelegramBotAPI", "live"],
  ["URL Shortener", "shortlink_bot", "python-telegram-bot", "live"],
  ["Stock Screener", "screener_bot", "aiogram", "error"],
  ["Voice Notes", "voicenotes_bot", "pyrogram", "draft"],
  ["Study Buddy", "studdybuddy_bot", "python-telegram-bot", "live"],
  ["Rent Tracker", "renttracker_bot", "aiogram", "live"],
  ["Recipe Finder", "recipefinder_bot", "pyTelegramBotAPI", "live"],
  ["Cargo Track", "cargotrack_bot", "python-telegram-bot", "live"],
  ["Tattoo Ideas", "tattooideas_bot", "aiogram", "paused"],
  ["UPI Alerts", "upialerts_bot", "python-telegram-bot", "live"],
  ["Trek Buddy", "trekbuddy_bot", "pyTelegramBotAPI", "live"],
  ["Med Reminder", "medreminder_bot", "python-telegram-bot", "live"],
  ["SaaS Metrics", "saasmetrics_bot", "aiogram", "live"],
  ["Gift Finder", "giftfinder_bot", "python-telegram-bot", "live"],
  ["Exam Prep", "examprep_bot", "aiogram", "compiling"],
];

const versions: Record<Library, string[]> = {
  "python-telegram-bot": ["21.6", "21.4", "20.8", "13.15"],
  aiogram: ["3.15.0", "3.7.0", "2.25.1"],
  pyTelegramBotAPI: ["4.24.0", "4.14.1"],
  pyrogram: ["2.0.106"],
};

const pins: Record<Library, string> = {
  "python-telegram-bot": "python-telegram-bot>=21.6",
  aiogram: "aiogram>=3.15",
  pyTelegramBotAPI: "pyTelegramBotAPI>=4.24",
  pyrogram: "pyrogram + TgCrypto",
};

const importsByLib: Record<Library, { module: string; pypi: string; pin?: string }[]> = {
  "python-telegram-bot": [
    { module: "telegram.ext", pypi: "python-telegram-bot", pin: ">=21.6" },
    { module: "dotenv", pypi: "python-dotenv" },
  ],
  aiogram: [
    { module: "aiogram", pypi: "aiogram", pin: ">=3.15" },
    { module: "aiohttp", pypi: "aiohttp" },
  ],
  pyTelegramBotAPI: [
    { module: "telebot", pypi: "pyTelegramBotAPI", pin: ">=4.24" },
    { module: "PIL", pypi: "Pillow" },
  ],
  pyrogram: [
    { module: "pyrogram", pypi: "pyrogram" },
    { module: "TgCrypto", pypi: "TgCrypto" },
  ],
};

const commandSets = [
  ["/start", "/help", "/price", "echo"],
  ["/start", "/help", "/rates", "/subscribe"],
  ["/start", "/help", "/ticket", "callback:close"],
  ["/start", "/random", "/top", "echo"],
  ["/start", "/btc", "/eth", "/alert"],
  ["/start", "/catalog", "/cart", "/checkout"],
  ["/start", "/invoice", "callback:paid"],
  ["/start", "/quiz", "callback:answer"],
  ["/start", "/weather", "/forecast"],
  ["/start", "/jobs", "/filter", "/alerts"],
  ["/start", "/summarise", "echo"],
  ["/start", "/workout", "/diet", "/streak"],
  ["/start", "/sync", "callback:sheet"],
  ["/start", "/movies", "/showtimes"],
  ["/start", "/digest", "/topics"],
  ["/start", "/live", "/score"],
  ["/start", "/lead", "/pricing", "echo"],
  ["/start", "/translate", "/lang"],
  ["/start", "/merge", "/split", "/compress"],
  ["/start", "/quote", "/subscribe"],
  ["/start", "/shorten", "/stats"],
  ["/start", "/screen", "/watchlist"],
  ["/start", "/record", "/send"],
  ["/start", "/plan", "/flashcards"],
  ["/start", "/rent", "/remind"],
  ["/start", "/recipe", "/shopping"],
  ["/start", "/track", "/notify"],
  ["/start", "/style", "/gallery"],
  ["/start", "/upi", "/link"],
  ["/start", "/trek", "/gear"],
  ["/start", "/meds", "/refill"],
  ["/start", "/mrr", "/churn"],
  ["/start", "/gift", "/budget"],
  ["/start", "/exam", "/revise"],
];

const regions = ["iad1", "fra1", "bom1", "sin1", "sfo1"];

const sourceTemplate = (lib: Library, commands: string[]) => {
  if (lib === "aiogram") {
    return `import asyncio
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

BOT_TOKEN = os.environ["BOT_TOKEN"]

dp = Dispatcher()

${commands
  .filter((c) => c.startsWith("/"))
  .slice(0, 3)
  .map(
    (c) => `@dp.message(Command("${c.slice(1)}"))
async def ${c.slice(1)}_handler(message: types.Message):
    await message.answer("${c} → compiled by BotForge ⚡")`,
  )
  .join("\n\n")}

@dp.message()
async def echo(message: types.Message):
    await message.answer(message.text)

async def main():
    bot = Bot(token=BOT_TOKEN)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())`;
  }
  if (lib === "pyTelegramBotAPI") {
    return `import os
import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton

bot = telebot.TeleBot(os.environ["BOT_TOKEN"])

${commands
  .filter((c) => c.startsWith("/"))
  .slice(0, 3)
  .map(
    (c) => `@bot.message_handler(commands=["${c.slice(1)}"])
def ${c.slice(1)}(message):
    bot.reply_to(message, "${c} → compiled by BotForge ⚡")`,
  )
  .join("\n\n")}

@bot.message_handler(func=lambda m: True)
def echo(message):
    bot.reply_to(message, message.text)

bot.infinity_polling()`;
  }
  if (lib === "pyrogram") {
    return `import os
from pyrogram import Client, filters

app = Client("botforge", api_id=os.environ["API_ID"],
             api_hash=os.environ["API_HASH"], bot_token=os.environ["BOT_TOKEN"])

@app.on_message(filters.command("start"))
async def start(client, message):
    await message.reply_text("BotForge is live ⚡")

app.run()`;
  }
  return `import os
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters

logging.basicConfig(level=logging.INFO)

${commands
  .filter((c) => c.startsWith("/"))
  .slice(0, 3)
  .map(
    (c) => `async def ${c.slice(1)}(update: Update, context):
    await update.message.reply_text("${c} → compiled by BotForge ⚡")`,
  )
  .join("\n\n")}

async def echo(update: Update, context):
    await update.message.reply_text(update.message.text)

def main():
    app = Application.builder().token(os.environ["BOT_TOKEN"]).build()
${commands
  .filter((c) => c.startsWith("/"))
  .slice(0, 3)
  .map((c) => `    app.add_handler(CommandHandler("${c.slice(1)}", ${c.slice(1)}))`)
  .join("\n")}
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
    app.run_polling()

if __name__ == "__main__":
    main()`;
};

const envTemplate = (): Bot["env"] => [
  { key: "BOT_TOKEN", value: "771234567:AAH•••••••••••••••••••••••", secret: true },
  { key: "TZ", value: "Asia/Kolkata", secret: false },
  { key: "LOG_LEVEL", value: "INFO", secret: false },
  ...(chance(0.4) ? [{ key: "OPENAI_API_KEY", value: "sk-proj-••••••••••••••••", secret: true }] : []),
];

function series(days: number, base: number, volatility = 0.18, trend = 0.012) {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < days; i++) {
    v = v * (1 + trend) * (1 + (rnd() - 0.5) * volatility);
    out.push(Math.round(v));
  }
  return out;
}

export const bots: Bot[] = botNames.map(([name, slug, library, status], i) => {
  const owner = users[i % 18];
  const commands = commandSets[i % commandSets.length];
  const updates = status === "draft" ? 0 : int(240, 96_000);
  const createdAt = iso(int(10, 320));
  return {
    id: `b_${(0x7f31 + i * 713).toString(16)}`,
    slug,
    name,
    handle: `@${slug}`,
    tokenMask: `${int(700000000, 799999999)}:AA${pick(["H", "G", "k", "Q"])}•••••••••••••••••••••`,
    ownerId: owner.id,
    status,
    library,
    version: pick(versions[library]),
    handlers: commands,
    imports: importsByLib[library],
    updates24h: updates,
    updates7d: series(14, updates * 0.85 || 30, 0.22, 0.005),
    successRate: status === "error" ? float(61, 78) : float(97.2, 99.99, 2),
    p95: int(48, 430),
    createdAt,
    lastDeploy: iso(int(0, 9), int(0, 23), int(0, 59)),
    region: pick(regions),
    env: envTemplate(),
    webhook: {
      url: `https://botforge-cloud.vercel.app/api/tg/${`b_${(0x7f31 + i * 713).toString(16)}`}`,
      deliveries: int(1200, 240_000),
      failures: chance(0.4) ? int(0, 60) : 0,
      lastStatus: 200,
      secretSet: true,
    },
    source: sourceTemplate(library, commands),
    flags: [`pin:${pins[library]}`, "auto-requirements", "webhook-mode"],
    cpuMs: int(4, 42),
    storageKb: int(8, 240),
  };
});

export const botOwner = (bot: Bot) => users.find((u) => u.id === bot.ownerId)!;
export const getBot = (id: string) => bots.find((b) => b.id === id);
export const ownerBots = (userId: string) => bots.filter((b) => b.ownerId === userId);

/* ------------------------------------------------------------------ */
/* metrics                                                             */
/* ------------------------------------------------------------------ */

export type Range = "24h" | "7d" | "30d" | "90d";
export const ranges: Range[] = ["24h", "7d", "30d", "90d"];

const rangeMeta: Record<Range, { points: number; base: number; vol: number; trend: number; label: string }> = {
  "24h": { points: 24, base: 4200, vol: 0.24, trend: 0.006, label: "hour" },
  "7d": { points: 28, base: 7200, vol: 0.2, trend: 0.008, label: "6h" },
  "30d": { points: 30, base: 88_000, vol: 0.16, trend: 0.01, label: "day" },
  "90d": { points: 45, base: 44_000, vol: 0.2, trend: 0.018, label: "2d" },
};

export function overviewSeries(range: Range) {
  const m = rangeMeta[range];
  const updates = series(m.points, m.base, m.vol, m.trend);
  const replies = updates.map((u, i) => Math.round(u * (0.91 + ((i % 7) * 0.008) + rnd() * 0.03)));
  const errors = updates.map((u, i) => Math.max(0, Math.round(u * (0.004 + rnd() * 0.008))));
  const latency = updates.map(() => Number((120 + rnd() * 90).toFixed(0)));
  const labels = updates.map((_, i) => {
    if (range === "24h") return `${String(i).padStart(2, "0")}:00`;
    if (range === "7d") return `D${Math.floor(i / 4) + 1} · ${String((i % 4) * 6).padStart(2, "0")}h`;
    if (range === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - (m.points - 1 - i));
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    const d = new Date();
    d.setDate(d.getDate() - (m.points - 1 - i) * 2);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
  return { updates, replies, errors, latency, labels };
}

export const kpis = {
  liveBots: bots.filter((b) => b.status === "live").length,
  totalBots: bots.length,
  updates24h: bots.reduce((a, b) => a + b.updates24h, 0),
  successRate: 99.92,
  p95: 186,
  mrr: users.reduce((a, u) => a + u.mrr, 0),
  arpu: 0,
  users: users.length,
  paidUsers: users.filter((u) => u.plan !== "free").length,
  churn: 1.8,
  newUsers7d: 1284,
  errorRate: 0.08,
  deploys24h: 61,
  avgDeploySeconds: 34,
};
kpis.arpu = Math.round((kpis.mrr / Math.max(1, kpis.paidUsers)) * 100) / 100;

export const revenueSeries = series(30, 2600, 0.06, 0.021).map((v, i) => ({
  label: `D${i + 1}`,
  mrr: v,
  expansion: Math.round(v * (0.13 + rnd() * 0.05)),
  churn: Math.round(v * (0.02 + rnd() * 0.02)),
}));

/* ------------------------------------------------------------------ */
/* logs                                                                */
/* ------------------------------------------------------------------ */

const logMessages: [LogLine["event"], LogLine["level"], string][] = [
  ["update", "info", 'update "/start" from @{user} · chat {chat}'],
  ["reply", "success", 'reply → "Hey {name}! I am live 24/7." ({ms} ms)'],
  ["webhook", "success", "setWebhook → /api/tg/{bot} · registered"],
  ["update", "info", 'update {msg} from @{user} · chat {chat}'],
  ["compile", "info", "analysing main.py · {n} handlers · {m} imports"],
  ["reply", "success", "inline keyboard sent · callback_data=price_1 ({ms} ms)"],
  ["error", "error", "TelegramError: Bad Request: message is too long (429 retry in 1.2s)"],
  ["webhook", "warn", "getUpdates backlog 1 update · cold start resolved in 812 ms"],
  ["auth", "success", "getMe → @{bot} · ok ({ms} ms)"],
  ["update", "info", 'callback "tier:pro" from @{user} · chat {chat}'],
  ["reply", "success", "photo uploaded · 84 KB · caption compiled ({ms} ms)"],
  ["error", "error", "connect ETIMEDOUT upstream api.telegram.org:443 after 2 retries"],
  ["compile", "success", "compiled behaviour: {n} commands · answer inline"],
  ["webhook", "warn", "rate limit nearing · 27 req/s of 30 req/s window"],
];

const names = ["Arslan", "Mira", "Kenji", "Sana", "Lucas", "Anna", "Fatima", "Rohit", "Priya"];
const handles = ["arslan", "miraok", "kenjit", "sanaiq", "lucash", "annal", "fatima", "rohits", "priyan"];

export const logs: LogLine[] = Array.from({ length: 260 }).map((_, i) => {
  const bot = bots[int(0, bots.length - 2)];
  const [event, level, template] = logMessages[int(0, logMessages.length - 1)];
  const n = int(0, 7);
  const idx = int(0, names.length - 1);
  const message = template
    .replace(/\{user\}/g, handles[idx])
    .replace(/\{name\}/g, names[idx])
    .replace(/\{chat\}/g, String(int(100000000, 999999999)))
    .replace(/\{ms\}/g, String(int(24, 420)))
    .replace(/\{n\}/g, String(int(2, 8)))
    .replace(/\{m\}/g, String(int(1, 4)))
    .replace(/\{bot\}/g, bot.slug)
    .replace(/\{msg\}/g, pick(['"/help"', '"hello"', '"/price pro"', '"/rates btc"']));
  return {
    id: `log_${(i + 1).toString().padStart(4, "0")}`,
    ts: isoMinAgo(260 - i + int(0, 3)),
    level,
    bot: bot.slug,
    event,
    message,
    latency: ["reply", "auth", "update"].includes(event) ? int(24, 420) : null,
    chat: String(int(100000000, 999999999)),
    payload:
      event === "update"
        ? {
            update_id: 400000 + n * 37,
            message: {
              message_id: 1200 + n,
              from: { id: 771234567, is_bot: false, first_name: names[idx], username: handles[idx] },
              chat: { id: Number(String(int(100000000, 999999999))), type: "private" },
              date: Math.floor(Date.now() / 1000) - 30,
              text: "/start",
            },
          }
        : undefined,
  };
});

/* ------------------------------------------------------------------ */
/* invoices, tickets, audit, flags, templates, health                  */
/* ------------------------------------------------------------------ */

const plans: Plan[] = ["free", "pro", "scale"];
const methods = ["Visa •••• 4242", "Mastercard •••• 8801", "UPI · arslan@okhdfc", "Amex •••• 1009", "PayPal"];

export const invoices: Invoice[] = Array.from({ length: 28 }).map((_, i) => {
  const user = users[int(0, users.length - 1)];
  const plan: Plan = chance(0.22) ? "scale" : "pro";
  const amount = plan === "scale" ? 149 : 29;
  const roll = rnd();
  return {
    id: `INV-${2026}${String(9 - Math.floor(i / 10)).padStart(2, "0")}-${String(1200 - i * 3).padStart(4, "0")}`,
    customer: user.name,
    email: user.email,
    plan,
    amount: roll < 0.05 ? 0 : roll < 0.1 ? amount * 12 : amount,
    status: roll > 0.93 ? "failed" : roll > 0.88 ? "open" : roll > 0.86 ? "refunded" : "paid",
    date: iso(int(0, 60)),
    method: pick(methods),
  };
});

export const planMix = plans.map((plan) => ({
  plan,
  users: users.filter((u) => u.plan === plan).length,
  revenue: users.filter((u) => u.plan === plan).reduce((a, u) => a + u.mrr, 0),
}));

export const tickets: Ticket[] = [
  {
    id: "TCK-4821",
    subject: "Webhook returns 401 after token rotation",
    user: "Dmitri Volkov",
    email: "dmitri@botship.ru",
    category: "deploy",
    priority: "urgent",
    status: "open",
    updated: isoMinAgo(12),
    unread: 2,
    messages: [
      {
        from: "user",
        author: "Dmitri Volkov",
        at: isoMinAgo(96),
        body: "I rotated the bot token in BotFather and redeployed. Telegram now gets a 401 from the webhook endpoint. The token in the env vault looks correct but /api/tg/b_… rejects every update.",
      },
      {
        from: "admin",
        author: "Mira Okonkwo",
        at: isoMinAgo(52),
        body: "Thanks Dmitri — the webhook secret is cached for 10 minutes after a rotation. I've flushed the cache for your bot. Can you send /start once and confirm?",
      },
      {
        from: "user",
        author: "Dmitri Volkov",
        at: isoMinAgo(12),
        body: "Still 401 on my side. Screenshot of the console attached — the deliveries counter stays at 0.",
      },
    ],
  },
  {
    id: "TCK-4820",
    subject: "Invoice charged twice for October",
    user: "Sana Iqbal",
    email: "sana@quickbots.pk",
    category: "billing",
    priority: "high",
    status: "pending",
    updated: isoMinAgo(58),
    unread: 1,
    messages: [
      {
        from: "user",
        author: "Sana Iqbal",
        at: isoMinAgo(58),
        body: "I see two $29 charges on Oct 3. Can you refund the duplicate?",
      },
    ],
  },
  {
    id: "TCK-4819",
    subject: "aiogram 3.15 import fails on recompile",
    user: "Chen Wei",
    email: "chen@weilabs.cn",
    category: "bug",
    priority: "high",
    status: "open",
    updated: isoMinAgo(140),
    unread: 0,
    messages: [
      {
        from: "user",
        author: "Chen Wei",
        at: isoMinAgo(140),
        body: "Recompile fails with `ModuleNotFoundError: aiogram.filters` even though requirements pin aiogram>=3.15.",
      },
    ],
  },
  {
    id: "TCK-4818",
    subject: "Abusive bot impersonating a bank",
    user: "Grace Mensah",
    email: "grace@accrabots.gh",
    category: "abuse",
    priority: "urgent",
    status: "open",
    updated: isoMinAgo(210),
    unread: 3,
    messages: [
      {
        from: "user",
        author: "Grace Mensah",
        at: isoMinAgo(210),
        body: "User @secure_gh_bank is running a phishing flow through a bot hosted here. Please suspend.",
      },
    ],
  },
  {
    id: "TCK-4817",
    subject: "Feature request: scheduled broadcasts",
    user: "Rohit Sharma",
    email: "rohit@mumbaidev.in",
    category: "feature",
    priority: "low",
    status: "pending",
    updated: isoMinAgo(400),
    unread: 0,
    messages: [
      {
        from: "user",
        author: "Rohit Sharma",
        at: isoMinAgo(400),
        body: "Any plan for cron-style broadcasts to all chats? I'd pay for that on scale.",
      },
    ],
  },
  {
    id: "TCK-4816",
    subject: "Cold start spiking p95 in bom1",
    user: "Priya Nair",
    email: "priya@nair.co",
    category: "bug",
    priority: "normal",
    status: "resolved",
    updated: isoMinAgo(1500),
    unread: 0,
    messages: [
      {
        from: "user",
        author: "Priya Nair",
        at: isoMinAgo(1600),
        body: "p95 jumped to 900ms this morning from bom1.",
      },
      {
        from: "admin",
        author: "Arslan Ansari",
        at: isoMinAgo(1500),
        body: "Confirmed a cold-start storm after the deploy; Redis keep-warm now covers bom1. p95 is back under 200ms.",
      },
    ],
  },
  {
    id: "TCK-4815",
    subject: "Can I export logs to BigQuery?",
    user: "Anna Lindqvist",
    email: "anna@nordbot.se",
    category: "feature",
    priority: "normal",
    status: "open",
    updated: isoMinAgo(1900),
    unread: 1,
    messages: [
      {
        from: "user",
        author: "Anna Lindqvist",
        at: isoMinAgo(1900),
        body: "We want to pipe the log stream into BigQuery. Is there a sink or a signed webhook?",
      },
    ],
  },
  {
    id: "TCK-4814",
    subject: "Deploy stuck at compiling",
    user: "Omar Haddad",
    email: "omar@haddad.ma",
    category: "deploy",
    priority: "high",
    status: "resolved",
    updated: isoMinAgo(2600),
    unread: 0,
    messages: [
      {
        from: "user",
        author: "Omar Haddad",
        at: isoMinAgo(2650),
        body: "Bot b_7f31 dangling in compiling for 20 minutes.",
      },
      {
        from: "admin",
        author: "Mira Okonkwo",
        at: isoMinAgo(2600),
        body: "The analyser worker restarted; your bot compiled and went live. Sorry for the wait.",
      },
    ],
  },
];

const auditActions: [string, string, AuditEntry["severity"]][] = [
  ["bot.suspend", "b_7f31 · Price Radar", "high"],
  ["bot.resume", "b_7f9e · Echo Bot", "low"],
  ["bot.delete", "b_81c4 · Meme Machine", "high"],
  ["env.reveal", "b_7f9e · BOT_TOKEN", "medium"],
  ["user.role_change", "usr_0007 → admin", "high"],
  ["user.suspend", "usr_0017 · Aisha Bello", "high"],
  ["billing.refund", "INV-202609-1204 · $29.00", "medium"],
  ["flag.toggle", "aiogram-v3-compiler → on", "medium"],
  ["apikey.create", "ci-deployer · read/write", "medium"],
  ["login.success", "admin console · 103.21.58.4", "low"],
  ["login.failed", "admin console · 45.83.12.199", "high"],
  ["bot.recompile", "b_81a0 · SupportDesk", "low"],
  ["webhook.rotate_secret", "b_7f9e", "medium"],
  ["export.logs", "260 lines · CSV", "low"],
  ["settings.retention", "log retention 30d → 90d", "medium"],
  ["impersonate.start", "usr_0005 · Lucas Ferreira", "high"],
];
const actors = ["Arslan Ansari", "Mira Okonkwo", "Anna Lindqvist", "system", "api:ci-deployer"];

export const audit: AuditEntry[] = Array.from({ length: 46 }).map((_, i) => {
  const [action, target, severity] = auditActions[i % auditActions.length];
  const actor = pick(actors);
  const person = users.find((u) => u.name === actor);
  return {
    id: `aud_${(9000 - i).toString()}`,
    actor,
    actorColor: person?.color ?? "#64748b",
    action,
    target,
    ip: `${int(11, 220)}.${int(2, 250)}.${int(2, 250)}.${int(2, 250)}`,
    time: isoMinAgo(i * int(7, 42) + 4),
    severity,
    meta: pick([
      "admin console",
      "REST API · /v1/admin",
      "scheduler",
      "Vercel edge · iad1",
      "webhook handler",
    ]),
  };
});

export const flags: Flag[] = [
  {
    key: "aiogram-v3-compiler",
    name: "aiogram v3 compiler",
    description: "Compile aiogram 3.x routers into the webhook engine instead of the legacy shim.",
    enabled: true,
    rollout: 100,
    envs: ["production"],
    owner: "Mira Okonkwo",
    updated: isoMinAgo(320),
    tag: "engine",
  },
  {
    key: "streaming-logs",
    name: "Streaming logs",
    description: "Server-sent events for the live console with 250ms flush.",
    enabled: true,
    rollout: 100,
    envs: ["production", "preview"],
    owner: "Arslan Ansari",
    updated: isoMinAgo(1440),
    tag: "console",
  },
  {
    key: "cron-broadcasts",
    name: "Scheduled broadcasts",
    description: "Cron-style message fan-out with per-chat rate limiting.",
    enabled: false,
    rollout: 12,
    envs: ["preview"],
    owner: "Rohit Sharma",
    updated: isoMinAgo(2600),
    tag: "engine",
  },
  {
    key: "token-rotation-guard",
    name: "Token rotation guard",
    description: "Flush the webhook secret cache instantly when a token is rotated.",
    enabled: true,
    rollout: 64,
    envs: ["production"],
    owner: "Priya Nair",
    updated: isoMinAgo(520),
    tag: "security",
  },
  {
    key: "pyrogram-support",
    name: "Pyrogram support",
    description: "Allow pyrogram + TgCrypto bots through the analyser.",
    enabled: true,
    rollout: 100,
    envs: ["production", "preview"],
    owner: "Dmitri Volkov",
    updated: isoMinAgo(8100),
    tag: "analyser",
  },
  {
    key: "usage-based-billing",
    name: "Usage based billing",
    description: "Meter updates beyond 250k/mo and bill overage at $0.40 / 1k.",
    enabled: false,
    rollout: 0,
    envs: ["staging"],
    owner: "Anna Lindqvist",
    updated: isoMinAgo(4000),
    tag: "billing",
  },
  {
    key: "cold-start-keepwarm",
    name: "Cold start keep-warm",
    description: "Ping edge functions every 90s in bom1 and sin1 to avoid cold starts.",
    enabled: true,
    rollout: 100,
    envs: ["production"],
    owner: "Arslan Ansari",
    updated: isoMinAgo(210),
    tag: "infra",
  },
  {
    key: "workspace-sso",
    name: "Workspace SSO",
    description: "SAML SSO for scale-plan workspaces.",
    enabled: false,
    rollout: 20,
    envs: ["staging", "preview"],
    owner: "Mira Okonkwo",
    updated: isoMinAgo(12600),
    tag: "auth",
  },
];

export const templates: Template[] = [
  {
    id: "tpl_echo",
    name: "Echo Starter",
    library: "python-telegram-bot",
    description: "Minimal PTB 21 starter with /start, /help and a text echo handler.",
    deploys: 8421,
    rating: 4.9,
    tags: ["starter", "ptb"],
    accent: "#34e0a1",
    source: sourceTemplate("python-telegram-bot", ["/start", "/help", "echo"]),
  },
  {
    id: "tpl_aiogram",
    name: "aiogram Router Kit",
    library: "aiogram",
    description: "Routers, FSM states and inline keyboards wired for aiogram 3.15.",
    deploys: 5290,
    rating: 4.8,
    tags: ["aiogram", "fsm"],
    accent: "#8b7cff",
    source: sourceTemplate("aiogram", ["/start", "/help", "/rates"]),
  },
  {
    id: "tpl_shop",
    name: "Shop Assistant",
    library: "python-telegram-bot",
    description: "Catalog, cart and checkout flow with callback data and order summaries.",
    deploys: 3110,
    rating: 4.7,
    tags: ["commerce", "callbacks"],
    accent: "#4cc9f0",
    source: sourceTemplate("python-telegram-bot", ["/start", "/catalog", "/cart"]),
  },
  {
    id: "tpl_support",
    name: "Support Desk",
    library: "aiogram",
    description: "Ticket intake with thread routing, SLA tags and operator handoff.",
    deploys: 2874,
    rating: 4.8,
    tags: ["support", "routing"],
    accent: "#ff8a5c",
    source: sourceTemplate("aiogram", ["/start", "/ticket"]),
  },
  {
    id: "tpl_crypto",
    name: "Crypto Alerts",
    library: "aiogram",
    description: "Price thresholds, watchlists and alert fan-out via Bot API.",
    deploys: 2109,
    rating: 4.5,
    tags: ["finance", "alerts"],
    accent: "#f5b544",
    source: sourceTemplate("aiogram", ["/start", "/btc", "/alert"]),
  },
  {
    id: "tpl_quiz",
    name: "Quiz Master",
    library: "pyTelegramBotAPI",
    description: "Timed quizzes, inline answer callbacks and leaderboard persistence.",
    deploys: 1780,
    rating: 4.6,
    tags: ["games", "leaderboard"],
    accent: "#ff6fb5",
    source: sourceTemplate("pyTelegramBotAPI", ["/start", "/quiz"]),
  },
  {
    id: "tpl_digest",
    name: "Blog Digest",
    library: "python-telegram-bot",
    description: "RSS-to-Telegram digest with per-topic subscriptions.",
    deploys: 1420,
    rating: 4.4,
    tags: ["content", "rss"],
    accent: "#a3e635",
    source: sourceTemplate("python-telegram-bot", ["/start", "/digest", "/topics"]),
  },
  {
    id: "tpl_pdf",
    name: "PDF Toolkit",
    library: "python-telegram-bot",
    description: "Merge, split and compress PDFs with Pillow and pypdf.",
    deploys: 980,
    rating: 4.3,
    tags: ["utility", "files"],
    accent: "#c4b5fd",
    source: sourceTemplate("python-telegram-bot", ["/start", "/merge", "/split"]),
  },
  {
    id: "tpl_pyro",
    name: "Pyrogram Userbot",
    library: "pyrogram",
    description: "MTProto client scaffold with TgCrypto accelerated sessions.",
    deploys: 640,
    rating: 4.1,
    tags: ["mtproto", "advanced"],
    accent: "#5eead4",
    source: sourceTemplate("pyrogram", ["/start"]),
  },
];

export const services: Service[] = [
  {
    name: "Webhook gateway",
    status: "operational",
    uptime: 99.99,
    latency: 41,
    region: "global",
    days: series(90, 100, 0.004, 0).map((v) => Math.min(100, Math.max(97, v / 100))),
  },
  {
    name: "Compile workers",
    status: "operational",
    uptime: 99.94,
    latency: 1280,
    region: "iad1 · fra1",
    days: series(90, 100, 0.02, 0).map((v) => Math.min(100, Math.max(94, v / 100))),
  },
  {
    name: "Log pipeline",
    status: "degraded",
    uptime: 99.71,
    latency: 96,
    region: "fra1",
    days: series(90, 100, 0.03, 0).map((v) => Math.min(100, Math.max(92, v / 100))),
  },
  {
    name: "Bot API proxy",
    status: "operational",
    uptime: 99.98,
    latency: 62,
    region: "global",
    days: series(90, 100, 0.006, 0).map((v) => Math.min(100, Math.max(97, v / 100))),
  },
  {
    name: "Billing & metering",
    status: "operational",
    uptime: 100,
    latency: 210,
    region: "us-east",
    days: series(90, 100, 0.002, 0).map((v) => Math.min(100, Math.max(99, v / 100))),
  },
  {
    name: "Auth / sessions",
    status: "operational",
    uptime: 99.96,
    latency: 34,
    region: "global",
    days: series(90, 100, 0.01, 0).map((v) => Math.min(100, Math.max(96, v / 100))),
  },
];

export const incidents: Incident[] = [
  {
    id: "INC-2291",
    title: "Elevated webhook latency in fra1",
    severity: "major",
    status: "monitoring",
    started: isoMinAgo(96),
    duration: "1h 12m",
    services: ["Webhook gateway", "Bot API proxy"],
    summary:
      "A regional egress upgrade caused 800ms p95 in fra1. Traffic is shifted to iad1 while we monitor error budgets.",
  },
  {
    id: "INC-2290",
    title: "Log pipeline backpressure",
    severity: "minor",
    status: "monitoring",
    started: isoMinAgo(320),
    duration: "48m",
    services: ["Log pipeline"],
    summary: "Consumer lag reached 90s during peak ingest. Shard count doubled; lag is draining.",
  },
  {
    id: "INC-2289",
    title: "Compile queue stalled after worker restart",
    severity: "minor",
    status: "resolved",
    started: isoMinAgo(2620),
    duration: "22m",
    services: ["Compile workers"],
    summary: "Restarted analyser workers; 14 bot compiles were retried automatically and succeeded.",
  },
  {
    id: "INC-2288",
    title: "Telegram API partial outage upstream",
    severity: "critical",
    status: "resolved",
    started: isoMinAgo(4400),
    duration: "1h 44m",
    services: ["Bot API proxy", "Webhook gateway"],
    summary: "Upstream 5xx from api.telegram.org. Updates were buffered and replayed; no messages lost.",
  },
  {
    id: "INC-2287",
    title: "Checkout failures for UPI mandates",
    severity: "minor",
    status: "resolved",
    started: isoMinAgo(8800),
    duration: "37m",
    services: ["Billing & metering"],
    summary: "Provider mandate callback regression; fixed and 22 invoices replayed successfully.",
  },
];

/* ------------------------------------------------------------------ */
/* derived helpers                                                     */
/* ------------------------------------------------------------------ */

export const activity = logs.slice(-14).reverse();

export const topBots = [...bots].sort((a, b) => b.updates24h - a.updates24h).slice(0, 6);

export const recentErrors = logs.filter((l) => l.level === "error").slice(0, 5);

export const latencies = series(24, 180, 0.2, 0.001);

export const libraryMix = (["python-telegram-bot", "aiogram", "pyTelegramBotAPI", "pyrogram"] as Library[]).map(
  (lib) => ({ label: lib, value: bots.filter((b) => b.library === lib).length }),
);

export const statusMix = (["live", "paused", "error", "draft", "compiling"] as BotStatus[]).map((status) => ({
  status,
  count: bots.filter((b) => b.status === status).length,
}));

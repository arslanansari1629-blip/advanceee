/**
 * Preview log engine.
 *
 * When no BotForge runner is attached, a deployed bot runs in PREVIEW mode: the
 * platform keeps the full lifecycle (install -> start -> logs -> stop ->
 * restart -> crash-loop) working against a deterministic, clearly-labelled
 * simulated Telegram gateway stream, so the whole console is explorable on a
 * plain Vercel deployment. Attach a runner and the exact same UI streams real
 * container stdout instead.
 */
import type { LogLine } from "./types";

const STEP_MS = 1500;

interface Profile {
  botName: string;
  user: string;
  startup: (masked: string | null) => Array<[LogLine["stream"], string]>;
  chatter: Array<[LogLine["stream"], string]>;
}

const profiles: Record<string, Profile> = {
  "ptb-v21": {
    botName: "@forge_echo_bot",
    user: "@arslan_a",
    startup: () => [
      ["stdout", "2026-10-29 09:14:02,113 - telegram.ext.Application - INFO - Application started"],
      ["stdout", "2026-10-29 09:14:02,140 - telegram.ext.Updater - INFO - Start polling"],
      ["telegram", "getMe → @forge_echo_bot · id 7712345678 · ok (118 ms)"],
      ["telegram", "setMyCommands → 4 commands registered"],
      ["stdout", "2026-10-29 09:14:02,913 - httpx - INFO - HTTP Request: POST getUpdates \"200 OK\""],
    ],
    chatter: [
      ["telegram", "update#48211 → /start from @arslan_a (id 7712345678)"],
      ["stdout", "handler: start_command → replied 'Echo bot is online 🟢' (63 ms)"],
      ["telegram", "update#48212 → text 'hello bot' from @arslan_a"],
      ["stdout", "handler: echo → replied 'hello bot' (41 ms)"],
      ["telegram", "update#48213 → text '/uptime' from @nxt_dev"],
      ["stdout", "handler: uptime → replied 'up 3h 12m · 0 crashes' (12 ms)"],
      ["telegram", "update#48214 → sticker from @riyaz_k → ignored (no handler)"],
      ["stdout", "2026-10-29 09:14:05,221 - httpx - INFO - HTTP Request: POST sendMessage \"200 OK\""],
      ["telegram", "update#48215 → /help from @arslan_a"],
      ["stdout", "handler: help → replied keyboard with 4 buttons (28 ms)"],
      ["stdout", "metrics: 1,284 updates handled · 0 failed · rss 48.2 MB"],
    ],
  },
  "ptb-v13": {
    botName: "@legacy_shop_bot",
    user: "@shop_owner",
    startup: () => [
      ["stdout", "2026-10-29 09:02:11,004 - telegram.ext.dispatcher - INFO - Updater started"],
      ["stdout", "2026-10-29 09:02:11,010 - telegram.ext.updater - INFO - Start polling"],
      ["telegram", "getMe → @legacy_shop_bot · ok"],
      ["stdout", "2026-10-29 09:02:11,880 - telegram.ext.updater - INFO - received update 8121"],
    ],
    chatter: [
      ["telegram", "update#8122 → /catalog from @buyer_22"],
      ["stdout", "handler: catalog → 12 products rendered as inline grid (128 ms)"],
      ["telegram", "callback_query 'buy:SKU-441' from @buyer_22"],
      ["stdout", "handler: add_to_cart → cart(2 items) total ₹1,498 (44 ms)"],
      ["telegram", "update#8123 → pre_checkout_query"],
      ["stdout", "handler: precheckout → answered ok (19 ms)"],
      ["telegram", "update#8124 → successful_payment ₹749"],
      ["stdout", "handler: payment → invoice #INV-9982 marked paid (61 ms)"],
    ],
  },
  telebot: {
    botName: "@telebot_helper",
    user: "@nxt_dev",
    startup: () => [
      ["stdout", "2026-10-29 08:55:10,411 - TeleBot - INFO - Starting polling"],
      ["telegram", "getMe → @telebot_helper · ok"],
      ["stdout", "plugins loaded: 3 handlers"],
    ],
    chatter: [
      ["telegram", "message#10231 → '/ping' from @nxt_dev"],
      ["stdout", "handler ping → 'pong 🏓' (8 ms)"],
      ["telegram", "message#10232 → document 'invoice.pdf' from @riyaz_k"],
      ["stdout", "download → 214.8 KB saved to /work/state/inbox/ (0.7 s)"],
      ["telegram", "message#10233 → '/stats' from @nxt_dev"],
      ["stdout", "handler stats → 412 messages today · 3 files (11 ms)"],
    ],
  },
  pyrogram: {
    botName: "@mtproto_userbot",
    user: "@arslan_a",
    startup: () => [
      ["stdout", "Pyrogram v2.0.106, © 2017-2024 Dan"],
      ["stdout", "[LOG] client connected to DC 4 (149.154.167.92:443)"],
      ["telegram", "get_me → @mtproto_userbot · session persisted to /work/state/bot.session"],
    ],
    chatter: [
      ["stdout", "[LOG] incoming: @arslan_a > 'deploy status?'"],
      ["telegram", "reply sent (message_id 912333) · 22 ms"],
      ["stdout", "[LOG] crypto: TgCrypto accelerated AES-IGE"],
      ["telegram", "update#77120 → new message in chat -1001234567890"],
      ["stdout", "[LOG] handler 'auto_reply' matched · replied with 1.2 KB markdown"],
    ],
  },
  telethon: {
    botName: "@telethon_forwarder",
    user: "@riyaz_k",
    startup: () => [
      ["stdout", "Telethon 1.36.0 · session file /work/state/session.sqlite"],
      ["telegram", "client.start() → @telethon_forwarder authorised"],
    ],
    chatter: [
      ["telegram", "NewMessage(channel=1001234, msg_id=5521) → forwarded to @my_backup"],
      ["stdout", "forward #5521 → ok (31 ms)"],
      ["telegram", "NewMessage(chat=7712345, msg_id=221) → filtered (no keyword hit)"],
    ],
  },
  "aiogram-v3": {
    botName: "@aiogram_shop_bot",
    user: "@shop_owner",
    startup: () => [
      ["stdout", "2026-10-29 09:30:00,101 - aiogram.dispatcher - INFO - Start polling"],
      ["telegram", "bot.me → @aiogram_shop_bot (id 7744110022)"],
      ["stdout", "2026-10-29 09:30:00,320 - aiogram.dispatcher - INFO - Run polling for bot"],
    ],
    chatter: [
      ["telegram", "Message(text='/start') from user 7712345678"],
      ["stdout", "middleware: rate_limit ok → handler start (14 ms)"],
      ["telegram", "Message(text='order 441') from user 7712345678"],
      ["stdout", "fsm: state → OrderForm.waiting_address"],
      ["stdout", "sqlalchemy: insert into orders ... committed"],
    ],
  },
  "aiogram-v2": {
    botName: "@old_aiogram_bot",
    user: "@nxt_dev",
    startup: () => [
      ["stdout", "2026-10-29 09:31:00,101 - aiogram.bot.bot - INFO - Bot @old_aiogram_bot started"],
      ["stdout", "2026-10-29 09:31:00,104 - aiogram.dispatcher.dispatcher - INFO - Start polling"],
    ],
    chatter: [
      ["telegram", "update#3321 → message '/menu' from @nxt_dev"],
      ["stdout", "handler menu → 5 buttons sent (17 ms)"],
      ["telegram", "update#3322 → callback 'page:2'"],
      ["stdout", "handler paginate → page 2/7 (9 ms)"],
    ],
  },
  discord: {
    botName: "forge#4412",
    user: "arslan_a",
    startup: () => [
      ["stdout", "[discord.ext.commands] logging in using static token"],
      ["stdout", "[discord.gateway] Shard ID None has connected to Gateway (Session ID: 8f2c...)"],
      ["telegram", "presence → watching 12 guilds"],
    ],
    chatter: [
      ["telegram", "message #general from arslan_a: !play lofi"],
      ["stdout", "[commands] invoked !play in guild 88213 (32 ms)"],
      ["stdout", "[voice] joined channel #lounge"],
    ],
  },
  generic: {
    botName: "@python_worker",
    user: "@arslan_a",
    startup: () => [
      ["stdout", "python 3.11.9 · pid 1 · starting entrypoint main.py"],
      ["stdout", "worker loop initialised"],
    ],
    chatter: [
      ["stdout", "tick · processed 1 job · queue depth 0"],
      ["stdout", "heartbeat ok · rss 41.3 MB"],
    ],
  },
};

export function previewProfile(profile: string): Profile {
  return profiles[profile] ?? profiles.generic;
}

/** simple deterministic RNG so replays are stable per bot */
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export interface PreviewArgs {
  profile: string;
  seed: number;
  maskedToken: string | null;
  requirements: string[];
  /** elapsed ms at which generation starts */
  fromElapsed: number;
  /** elapsed ms at which generation ends */
  toElapsed: number;
  startSeq: number;
  /** wall clock of the process start */
  startedAt: number;
}

/** Log lines emitted by the startup phase (packages installed, gateway connected). */
export function previewBootLog(args: {
  profile: string;
  requirements: string[];
  maskedToken: string | null;
  startSeq: number;
  startedAt: number;
}): LogLine[] {
  const p = previewProfile(args.profile);
  let seq = args.startSeq;
  const out: LogLine[] = [];
  const push = (stream: LogLine["stream"], message: string, ts = args.startedAt) =>
    out.push({ seq: seq++, stream, message, ts });

  push("system", "runner · allocating isolated sandbox (python 3.11.9, linux/amd64)");
  push("system", `runner · mount /work · workspace for bot`);
  if (args.requirements.length) {
    push(
      "system",
      `pip · resolving ${args.requirements.length} requirement${
        args.requirements.length > 1 ? "s" : ""
      } from requirements.txt`
    );
    for (const req of args.requirements.slice(0, 12)) {
      push("system", `pip · requirement already satisfied: ${req.replace(/[><=].*$/, "")} ✓`);
    }
    if (args.requirements.length > 12) {
      push("system", `pip · +${args.requirements.length - 12} more resolved from wheel cache`);
    }
  } else {
    push("system", "pip · no third-party requirements detected — stdlib only");
  }
  push("system", `systemd · spawned entrypoint main.py · cgroup 0.5 vCPU / 512 MB`);
  push("system", `telegram gateway · token ${args.maskedToken ?? "from env BOT_TOKEN"} verified`);
  for (const [stream, message] of p.startup(args.maskedToken)) push(stream, message);
  push("system", "healthcheck ok · bot is live · auto-restart armed");
  return out;
}

/** Chatter/heartbeat lines for a window of elapsed time. */
export function previewStream(args: PreviewArgs): LogLine[] {
  const p = previewProfile(args.profile);
  const out: LogLine[] = [];
  const rand = rng(args.seed + Math.floor(args.fromElapsed / STEP_MS));
  const fromStep = Math.ceil(args.fromElapsed / STEP_MS);
  const toStep = Math.floor(args.toElapsed / STEP_MS);
  let seq = args.startSeq;
  for (let step = fromStep; step <= toStep; step++) {
    const ts = args.startedAt + step * STEP_MS;
    const r = rand();
    if (step % 7 === 0) {
      const messages = 1180 + step;
      out.push({
        seq: seq++,
        stream: "stdout",
        message: `heartbeat · uptime ${Math.floor((step * STEP_MS) / 1000)}s · ${
          messages.toLocaleString("en-US")
        } updates · 0 errors · rss ${(44 + Math.floor(r * 9)).toFixed(1)} MB`,
        ts,
      });
    } else if (r < 0.72) {
      const [stream, message] = p.chatter[Math.floor(r * 97) % p.chatter.length];
      out.push({ seq: seq++, stream, message, ts });
    } else if (r > 0.985) {
      out.push({
        seq: seq++,
        stream: "stderr",
        message: "WARNING · flood control hit on sendMessage → retrying in 1s (attempt 1/3)",
        ts,
      });
    }
    if (out.length > 300) break;
  }
  return out;
}

export const PREVIEW_STEP_MS = STEP_MS;

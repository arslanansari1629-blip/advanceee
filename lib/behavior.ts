/**
 * Compiles the pasted Python into an executable bot program.
 *
 * BotForge does not run a Python process (that would need a container). Instead
 * it reads the handlers you wrote — `/start`, `/help`, echo behaviour, inline
 * buttons, fallback replies — and compiles them into a small behaviour spec
 * that the webhook endpoint executes in milliseconds for every update.
 *
 * Supported patterns:
 *   telebot        @bot.message_handler(commands=['start'])   bot.reply_to(m, "...")
 *   python-telegram-bot  CommandHandler("start", start)       await update.message.reply_text("...")
 *   aiogram        @dp.message(Command("start"))              await message.answer("...")
 *   callbacks      InlineKeyboardButton("Yes", callback_data="yes")
 */
import type { Behaviour, BehaviourCommand } from "./types";

/** Engine commands every bot gets, unless the code overrides them. */
const ENGINE_COMMANDS: BehaviourCommand[] = [
  { cmd: "id", reply: "🪪 Your chat id: <code>{chat_id}</code>\nUser id: <code>{user_id}</code>", source: "engine" },
  { cmd: "ping", reply: "🏓 pong · engine latency {latency} ms", source: "engine" },
  { cmd: "uptime", reply: "⏱ BotForge engine uptime: {engine_uptime}\nYour bot has served {updates} update(s).", source: "engine" },
  { cmd: "time", reply: "🕒 {time}", source: "engine" },
];

const REPLY_CALLS =
  /(?:reply_text|reply_to|send_message|answer|edit_message_text|edit_text|respond|message\.reply|ctx\.reply)\s*\(\s*/;

const STRING_RE = /(f?)(["'])((?:\\.|(?!\2).)*)\2/;

function unescape(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

/** Turn a python f-string into an engine template. */
function toTemplate(raw: string, isF: boolean): string {
  let text = unescape(raw);

  if (isF) {
    // python escapes literal braces as {{ }} — recover engine placeholders
    text = text.replace(/\{\{([^{}]+)\}\}/g, "{$1}");
    // {message.from_user.first_name} -> {first_name}
    text = text.replace(/\{([^{}]+)\}/g, (_m, expr: string) => {
      const e = expr.trim();
      if (e.includes("first_name")) return "{first_name}";
      if (e.includes("last_name")) return "{last_name}";
      if (e.includes("username")) return "{username}";
      if (e.includes(".id") && /user|from_user|chat/.test(e)) {
        return /chat/.test(e) ? "{chat_id}" : "{user_id}";
      }
      if (e.includes(".text")) return "{text}";
      if (/date|time|now/.test(e)) return "{time}";
      if (e.includes("title") || e.includes("chat")) return "{chat_title}";
      return `{${e}}`;
    });
  }

  // common attribute paths without braces
  text = text
    .replace(/\{?\b(?:message|update\.effective_user|update\.message\.from_user|call)\.from_user\.first_name\}?/g, "{first_name}")
    .replace(/\{?\b(?:message|update)\.(?:chat)\.id\}?/g, "{chat_id}");
  return text;
}

/** Slice the full call expression (handles multi-line calls). */
function callWindow(body: string, start: number): string {
  let depth = 0;
  let seen = false;
  for (let i = start; i < body.length && i < start + 1200; i++) {
    const ch = body[i];
    if (ch === "(") {
      depth += 1;
      seen = true;
    } else if (ch === ")") {
      depth -= 1;
      if (seen && depth === 0) return body.slice(start, i + 1);
    }
  }
  return body.slice(start, start + 1200);
}

function extractReply(body: string): string | null {
  // walk every reply-style call and read the first string literal of each,
  // joining lines first so multi-line calls are not truncated
  let from = 0;
  for (let guard = 0; guard < 40; guard++) {
    const rest = body.slice(from);
    const hit = rest.search(REPLY_CALLS);
    if (hit < 0) break;
    const start = from + hit;
    const window = callWindow(body, start);
    // ignore the callback acknowledgement, its argument is an id not a message
    const isAck = /answer_callback_query|answerCallbackQuery/.test(body.slice(Math.max(0, start - 24), start + 24));
    const m = window.match(STRING_RE);
    if (m && !isAck) {
      const text = toTemplate(m[3], m[1] === "f");
      if (text.trim()) return text;
    }
    from = start + Math.max(1, window.length);
  }
  // text assigned to a variable first: msg = "hi"; bot.reply_to(m, msg)
  const varMatch = body.match(/\b(?:msg|text|reply|answer)\s*=\s*(f?)(["'])((?:\\.|(?!\2).)*)\2/);
  if (varMatch) return toTemplate(varMatch[3], varMatch[1] === "f");
  return null;
}

function bodyOf(lines: string[], startIdx: number): string {
  const baseIndent = (lines[startIdx].match(/^\s*/) ?? [""])[0].length;
  const out: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      out.push(line);
      continue;
    }
    const indent = (line.match(/^\s*/) ?? [""])[0].length;
    if (indent <= baseIndent) break;
    out.push(line);
  }
  return out.join("\n");
}

function findFunctionBody(lines: string[], name: string, fromIdx = 0): string | null {
  const defRe = new RegExp(`^\\s*(?:async\\s+)?def\\s+${name}\\s*\\(`);
  for (let i = fromIdx; i < lines.length; i++) {
    if (defRe.test(lines[i])) return bodyOf(lines, i);
  }
  return null;
}

function detectParseMode(code: string): Behaviour["parseMode"] {
  if (/parse_mode\s*=\s*["']HTML["']|ParseMode\.HTML|parse_mode\s*=\s*["']html["']/.test(code)) return "HTML";
  if (/ParseMode\.MARKDOWN_V2/.test(code)) return "MarkdownV2";
  if (/parse_mode\s*=\s*["']Markdown["']|ParseMode\.MARKDOWN\b/.test(code)) return "Markdown";
  return null;
}

/** All command names declared anywhere in the file (used for health checks). */
export function declaredCommands(code: string): string[] {
  const found = new Set<string>();
  for (const m of code.matchAll(/commands\s*=\s*\[([^\]]+)\]/g)) {
    for (const part of m[1].split(",")) {
      const cmd = part.replace(/["'\s]/g, "");
      if (/^[a-z0-9_]{1,32}$/i.test(cmd)) found.add(cmd.toLowerCase());
    }
  }
  for (const m of code.matchAll(/CommandHandler\(\s*["']([A-Za-z0-9_]+)["']/g)) {
    found.add(m[1].toLowerCase());
  }
  for (const m of code.matchAll(/Command\(\s*["']([A-Za-z0-9_]+)["']/g)) {
    found.add(m[1].toLowerCase());
  }
  if (/CommandStart\(\)/.test(code)) found.add("start");
  if (/CommandHelp\(\)/.test(code)) found.add("help");
  return [...found];
}

export function compileBehaviour(code: string): Behaviour {
  const lines = code.split("\n");
  const commands: BehaviourCommand[] = [];
  const notes: string[] = [];
  const seen = new Set<string>();

  const add = (cmd: string, reply: string | null, source: "code" | "engine" = "code") => {
    const name = cmd.toLowerCase().replace(/^\//, "");
    if (!/^[a-z0-9_]{1,32}$/.test(name) || seen.has(name)) return;
    seen.add(name);
    commands.push({
      cmd: name,
      reply: reply ?? `/${name} is registered, but BotForge could not read its reply text — edit it in the Behaviour tab.`,
      source,
    });
  };

  // ---- aiogram decorators with Command("x")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/@\w+(?:\.\w+)*\.message\(\s*Command(?:Start|Help)?\(/.test(line)) continue;
    const cmds = [...line.matchAll(/Command\(\s*["']([A-Za-z0-9_]+)["']/g)].map((m) => m[1]);
    if (/CommandStart\(\)/.test(line)) cmds.push("start");
    if (/CommandHelp\(\)/.test(line)) cmds.push("help");
    if (!cmds.length) continue;
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
      const def = lines[j].match(/^\s*(?:async\s+)?def\s+(\w+)/);
      if (def) {
        const body = bodyOf(lines, j);
        const reply = extractReply(body);
        for (const c of cmds) add(c, reply);
        break;
      }
    }
  }

  // ---- telebot decorators
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/@\w+\.message_handler\(/.test(line)) continue;
    const cmds = [...(line.matchAll(/commands\s*=\s*\[([^\]]+)\]/g) ?? [])].flatMap((m) =>
      m[1].split(",").map((s) => s.replace(/["'\s]/g, ""))
    );
    if (!cmds.length) continue;
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
      const def = lines[j].match(/^\s*(?:async\s+)?def\s+(\w+)/);
      if (def) {
        const body = bodyOf(lines, j);
        const reply = extractReply(body);
        for (const c of cmds) add(c, reply);
        break;
      }
    }
  }

  // ---- python-telegram-bot CommandHandler("x", handler)
  for (const m of code.matchAll(/CommandHandler\(\s*["']([A-Za-z0-9_]+)["']\s*,\s*([A-Za-z_]\w*)/g)) {
    const body = findFunctionBody(lines, m[2]);
    add(m[1], body ? extractReply(body) : null);
  }
  // lambdas inline: CommandHandler("x", lambda u, c: u.message.reply_text("hi"))
  for (const m of code.matchAll(/CommandHandler\(\s*["']([A-Za-z0-9_]+)["']\s*,\s*lambda[^)]*:\s*([^\n]+)/g)) {
    const str = m[2].match(STRING_RE);
    add(m[1], str ? toTemplate(str[3], str[1] === "f") : null);
  }

  // ---- echo / text handler
  let echo: string | null = null;
  for (const m of code.matchAll(
    /(?:reply_text|reply_to|send_message|answer)\(\s*(?:[^,]+,\s*)?(f?)(["'])((?:\\.|(?!\2).)*)\{?(?:message|update\.message)\.text\}?((?:\\.|(?!\2).)*)\2/g
  )) {
    echo = toTemplate(`${m[3]}{text}${m[4]}`, true);
    break;
  }
  if (!echo) {
    for (const m of code.matchAll(/(?:reply_text|reply_to|send_message|answer)\(\s*[^,)]*,\s*((?:message|update\.message)\.text)\s*\)/g)) {
      echo = "{text}";
      break;
    }
  }
  if (!echo && /echo/i.test(code) && /\.text/.test(code)) {
    echo = "{text}";
    notes.push("Echo handler detected — the engine mirrors incoming text.");
  }

  // ---- fallback reply (handler with no command)
  let fallback: string | null = null;
  const fallbackPatterns = [
    /@\w+\.message_handler\([^)]*content_types\s*=\s*\[\s*["']text["']/,
    /MessageHandler\(\s*filters\.TEXT/,
    /func\s*=\s*lambda\s+m\s*:\s*True/,
  ];
  for (let i = 0; i < lines.length; i++) {
    if (!fallbackPatterns.some((re) => re.test(lines[i]))) continue;
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
      const def = lines[j].match(/^\s*(?:async\s+)?def\s+(\w+)/);
      if (def) {
        fallback = extractReply(bodyOf(lines, j));
        break;
      }
    }
    if (fallback) break;
  }

  // ---- inline buttons
  const buttons: Behaviour["buttons"] = [];
  for (const m of code.matchAll(
    /InlineKeyboardButton\(\s*["']([^"']{1,40})["']\s*,\s*(?:callback_data\s*=\s*)?["']([^"']{1,60})["']/g
  )) {
    buttons.push({ label: m[1], data: m[2], reply: "" });
  }
  // callback replies: find the handler that answers this callback data
  for (const btn of buttons) {
    const data = btn.data.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const guard = new RegExp(`(?:call|callback)\\.data\\s*(?:==|===)\\s*["']${data}["']`);
    const hit = guard.exec(code);
    if (!hit) continue;
    const before = code.slice(0, hit.index).split("\n");
    const lineIdx = before.length - 1;
    for (let i = lineIdx; i < Math.min(lines.length, lineIdx + 8); i++) {
      const def = lines[i].match(/^\s*(?:async\s+)?def\s+(\w+)/);
      if (!def) continue;
      const reply = extractReply(bodyOf(lines, i));
      if (reply) btn.reply = reply;
      break;
    }
  }

  const parseMode = detectParseMode(code);

  // ---- engine defaults for anything the code did not define
  if (!seen.has("start")) {
    const first = commands[0];
    add(
      "start",
      first
        ? first.reply
        : "🟢 <b>{bot_name}</b> is live.\n\nBotForge is answering your updates instantly — no server, no polling.\n\nSend /help to see what I can do.",
      "engine"
    );
  }
  if (!seen.has("help")) {
    const list = commands.map((c) => `/${c.cmd}`).join(" · ");
    add("help", `📖 <b>Available commands</b>\n${list || "/start"}\n\nPowered by BotForge — webhook engine, always on.`, "engine");
  }
  for (const e of ENGINE_COMMANDS) if (!seen.has(e.cmd)) add(e.cmd, e.reply, "engine");

  if (!commands.some((c) => c.source === "code")) {
    notes.push(
      "No command handlers were recognised in your code, so the engine registered its own /start and /help. Add e.g. CommandHandler(\"price\", price) to control replies."
    );
  }
  if (echo) notes.push(`Echo mode: every non-command message is answered with “${echo.replace(/\n/g, " ").slice(0, 40)}”.`);

  return {
    commands: commands.sort((a, b) => (a.cmd === "start" ? -1 : b.cmd === "start" ? 1 : a.cmd.localeCompare(b.cmd))),
    echo,
    fallback,
    parseMode,
    buttons: buttons.slice(0, 12),
    notes,
  };
}

/** Render a template for one update. */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : m
  );
}

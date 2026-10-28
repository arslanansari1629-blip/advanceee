export interface Template {
  id: string;
  name: string;
  description: string;
  framework: string;
  requirements: string;
  code: string;
  badges: string[];
}

export const TEMPLATES: Template[] = [
  {
    id: "ptb-echo",
    name: "Echo bot · python-telegram-bot 21",
    description:
      "Modern asyncio Application with /start, /id, /uptime and a rate-limit-friendly echo handler.",
    framework: "python-telegram-bot v21",
    requirements: "python-telegram-bot>=21.6\npython-dotenv",
    badges: ["async", "inline keyboard", "logging"],
    code: `import asyncio
import logging
import os
import time

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("echo-bot")

BOT_TOKEN = os.environ["BOT_TOKEN"]
BOOTED_AT = time.time()


def uptime() -> str:
    seconds = int(time.time() - BOOTED_AT)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h}h {m}m {s}s"


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    kb = InlineKeyboardMarkup(
        [[InlineKeyboardButton("Uptime", callback_data="uptime"),
          InlineKeyboardButton("My ID", callback_data="myid")]]
    )
    await update.effective_message.reply_text(
        "Echo bot is online 🟢\\nSend me any text and I will echo it back.",
        reply_markup=kb,
    )
    log.info("start command from %s", update.effective_chat.id)


async def my_id(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        f"<code>{update.effective_chat.id}</code>", parse_mode=ParseMode.HTML
    )


async def on_button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    if query.data == "uptime":
        await query.edit_message_text(f"Uptime: <b>{uptime()}</b>", parse_mode=ParseMode.HTML)
    else:
        await query.edit_message_text(f"Chat ID: <code>{query.from_user.id}</code>", parse_mode=ParseMode.HTML)


async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = update.effective_message.text or ""
    await update.effective_message.reply_text(f"🔁 {text}")
    log.info("echo %s chars to %s", len(text), update.effective_chat.id)


def main() -> None:
    app: Application = (
        ApplicationBuilder().token(BOT_TOKEN).concurrent_updates(True).build()
    )
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("id", my_id))
    app.add_handler(CommandHandler("uptime", lambda u, c: u.effective_message.reply_text(f"⏱ {uptime()}")))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
    app.add_handler(__import__("telegram").ext.CallbackQueryHandler(on_button))
    log.info("polling started")
    app.run_polling(drop_pending_updates=True, allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
`,
  },
  {
    id: "telebot-simple",
    name: "Support bot · pyTelegramBotAPI",
    description: "Ticket intake bot that stores files and answers with a support menu.",
    framework: "pyTelegramBotAPI (telebot)",
    requirements: "pyTelegramBotAPI>=4.24\npython-dotenv",
    badges: ["file upload", "keyboard", "json state"],
    code: `import json
import os
import time

import telebot
from telebot import types

BOT_TOKEN = os.environ["BOT_TOKEN"]
bot = telebot.TeleBot(BOT_TOKEN, parse_mode="HTML")

STATE_FILE = "state.json"


def load_state():
    try:
        with open(STATE_FILE) as fh:
            return json.load(fh)
    except Exception:
        return {"tickets": 0}


def save_state(state):
    with open(STATE_FILE, "w") as fh:
        json.dump(state, fh)


@bot.message_handler(commands=["start"])
def start(message):
    kb = types.ReplyKeyboardMarkup(resize_keyboard=True)
    kb.add(types.KeyboardButton("🎫 New ticket"), types.KeyboardButton("📊 Stats"))
    bot.send_message(message.chat.id, "Support desk online. How can we help?", reply_markup=kb)


@bot.message_handler(func=lambda m: m.text == "🎫 New ticket")
def new_ticket(message):
    state = load_state()
    state["tickets"] += 1
    save_state(state)
    msg = bot.send_message(message.chat.id, f"Ticket <b>#{state['tickets']:04d}</b> created. Describe the issue:")
    bot.register_next_step_handler(msg, lambda m: bot.send_message(m.chat.id, "✅ Sent to the team."))


@bot.message_handler(func=lambda m: m.text == "📊 Stats")
def stats(message):
    state = load_state()
    bot.send_message(message.chat.id, f"Tickets today: <b>{state['tickets']}</b>")


@bot.message_handler(content_types=["document", "photo"])
def intake(message):
    bot.send_message(message.chat.id, "📎 Attachment received and queue for review.")


@bot.message_handler(func=lambda m: True)
def fallback(message):
    bot.send_message(message.chat.id, "Use /start to open the support menu.")


if __name__ == "__main__":
    print("support bot polling…", flush=True)
    bot.infinity_polling(timeout=30, long_polling_timeout=25)
`,
  },
  {
    id: "pyrogram-userbot",
    name: "Auto-forwarder · Pyrogram",
    description: "MTProto userbot that mirrors messages between channels with keyword filters.",
    framework: "Pyrogram (MTProto)",
    requirements: "pyrogram>=2.0.106\nTgCrypto",
    badges: ["MTProto", "session persistence", "filters"],
    code: `import os

from pyrogram import Client, filters

API_ID = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]
SESSION = os.environ.get("SESSION_STRING")

KEYWORDS = ("urgent", "invoice", "refund")

app = Client(
    "forwarder",
    api_id=API_ID,
    api_hash=API_HASH,
    session_string=SESSION or None,
    workdir=".",
)


@app.on_message(filters.group & filters.text)
async def mirror(client, message):
    body = (message.text or "").lower()
    if any(k in body for k in KEYWORDS):
        await app.send_message("me", f"🔔 keyword hit in {message.chat.title}: {message.text}")
        await message.forward("me")
        print(f"forwarded msg {message.id} from {message.chat.id}", flush=True)


@app.on_message(filters.command("ping"))
async def ping(client, message):
    await message.reply("pong 🏓")


if __name__ == "__main__":
    print("starting pyrogram client…", flush=True)
    app.run()
`,
  },
  {
    id: "aiogram-shop",
    name: "Order bot · aiogram 3",
    description: "FSM checkout flow with SQLite persistence and inline product catalogue.",
    framework: "aiogram v3",
    requirements: "aiogram>=3.15\naiosqlite",
    badges: ["FSM", "SQLite", "inline"],
    code: `import asyncio
import os

import aiosqlite
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

BOT_TOKEN = os.environ["BOT_TOKEN"]
bot = Bot(BOT_TOKEN)
dp = Dispatcher()


class Order(StatesGroup):
    item = State()
    address = State()


@dp.message(Command("start"))
async def start(message: Message):
    kb = InlineKeyboardBuilder()
    kb.button(text="☕ Coffee ₹199", callback_data="buy:coffee")
    kb.button(text="🍰 Cake ₹349", callback_data="buy:cake")
    await message.answer("Welcome to Forge Cafe. Pick something:", reply_markup=kb.as_markup())


@dp.callback_query(F.data.startswith("buy:"))
async def pick(callback, state: FSMContext):
    await state.update_data(item=callback.data.split(":")[1])
    await state.set_state(Order.address)
    await callback.message.answer("Great. Send me the delivery address.")
    await callback.answer()


@dp.message(Order.address)
async def address(message: Message, state: FSMContext):
    data = await state.get_data()
    async with aiosqlite.connect("orders.db") as db:
        await db.execute(
            "create table if not exists orders (id integer primary key, item text, address text, user integer)"
        )
        await db.execute(
            "insert into orders (item, address, user) values (?,?,?)",
            (data["item"], message.text, message.from_user.id),
        )
        await db.commit()
    await state.clear()
    await message.answer(f"✅ Order for <b>{data['item']}</b> confirmed.", parse_mode="HTML")


async def main():
    print("aiogram polling…", flush=True)
    await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())


if __name__ == "__main__":
    asyncio.run(main())
`,
  },
  {
    id: "worker",
    name: "Cron worker · plain Python",
    description: "No Telegram required — a supervised loop that hits an API and prints a report.",
    framework: "Plain Python",
    requirements: "requests",
    badges: ["no gateway", "cron", "heartbeat"],
    code: `import os
import time
from datetime import datetime

import requests

INTERVAL = int(os.environ.get("INTERVAL", "60"))
TARGET = os.environ.get("TARGET_URL", "https://api.github.com/zen")


def tick() -> None:
    started = time.time()
    try:
        res = requests.get(TARGET, timeout=10)
        print(f"[{datetime.utcnow():%H:%M:%S}] GET {TARGET} -> {res.status_code} ({len(res.content)}b)", flush=True)
        if res.ok and res.text:
            print(f"  payload: {res.text.strip()[:120]}", flush=True)
    except Exception as exc:
        print(f"  request failed: {exc}", flush=True)
    print(f"  took {time.time() - started:.2f}s · sleeping {INTERVAL}s", flush=True)


if __name__ == "__main__":
    print("worker online", flush=True)
    while True:
        tick()
        time.sleep(INTERVAL)
`,
  },
];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);

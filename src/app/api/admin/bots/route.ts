import { NextResponse } from "next/server";
import { bots, botOwner } from "@/lib/data";

export const dynamic = "force-dynamic";

const PYPI: Record<string, string> = {
  "telegram.ext": "python-telegram-bot>=21.6",
  telegram: "python-telegram-bot>=21.6",
  telebot: "pyTelegramBotAPI>=4.24",
  aiogram: "aiogram>=3.15",
  pyrogram: "pyrogram",
  TgCrypto: "TgCrypto",
  dotenv: "python-dotenv",
  PIL: "Pillow",
  cv2: "opencv-python",
  pandas: "pandas",
  numpy: "numpy",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const library = searchParams.get("library");
  const q = (searchParams.get("q") ?? "").toLowerCase();

  const rows = bots
    .filter((b) => (status && status !== "all" ? b.status === status : true))
    .filter((b) => (library && library !== "all" ? b.library === library : true))
    .filter((b) => (q ? `${b.name} ${b.slug} ${b.handlers.join(" ")}`.toLowerCase().includes(q) : true))
    .map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      status: b.status,
      library: b.library,
      version: b.version,
      handlers: b.handlers,
      updates_24h: b.updates24h,
      success_rate: b.successRate,
      p95_ms: b.p95,
      region: b.region,
      owner: { id: b.ownerId, email: botOwner(b).email },
      webhook: { url: b.webhook.url, last_status: b.webhook.lastStatus, failures: b.webhook.failures },
    }));

  return NextResponse.json({ count: rows.length, bots: rows }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  let body: { name?: string; token?: string; code?: string; library?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { name, token, code } = body;
  if (!name || name.trim().length < 3) {
    return NextResponse.json({ error: "name_too_short", detail: "name must be at least 3 characters" }, { status: 422 });
  }
  if (!token || !/^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(token)) {
    return NextResponse.json({ error: "invalid_token", detail: "expected 123456:AA… from @BotFather" }, { status: 422 });
  }
  if (!code || !/telegram|telebot|aiogram|pyrogram/.test(code)) {
    return NextResponse.json(
      { error: "no_framework_detected", detail: "import python-telegram-bot, aiogram, telebot or pyrogram" },
      { status: 422 },
    );
  }

  const imports = [...new Set([...code.matchAll(/^(?:from|import)\s+([a-zA-Z0-9_.]+)/gm)].map((m) => m[1]))].map((mod) => ({
    module: mod,
    pypi: PYPI[mod] ?? mod,
  }));
  const handlers = [...new Set([...code.matchAll(/CommandHandler\(\s*["']([\w_-]+)["']/g)].map((m) => `/${m[1]}`))];
  if (/MessageHandler|@dp\.message|func=lambda/.test(code)) handlers.push("echo");

  const id = `b_${Math.random().toString(16).slice(2, 6)}`;
  return NextResponse.json(
    {
      id,
      name,
      library: body.library ?? "python-telegram-bot",
      handlers,
      requirements: imports.map((i) => i.pypi),
      webhook: { url: `https://botforge-cloud.vercel.app/api/tg/${id}`, registered: true },
      compile_ms: 1840,
      note: "Demo compile · no real Telegram call is made",
    },
    { status: 201 },
  );
}

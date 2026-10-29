"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Code2,
  Cpu,
  KeyRound,
  Loader2,
  Rocket,
  ScanLine,
  Terminal,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/format";
import { useToast } from "./toast";

const sample = `import os
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)

async def start(update: Update, context):
    await update.message.reply_text("Welcome to Forge! Type /help.")

async def help_cmd(update: Update, context):
    await update.message.reply_text("Commands: /start /help /price")

async def price(update: Update, context):
    await update.message.reply_text("Pro is $29/mo, Scale is $149/mo.")

async def echo(update: Update, context):
    await update.message.reply_text(update.message.text)

def main():
    app = Application.builder().token(os.environ["BOT_TOKEN"]).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("price", price))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
    app.run_polling()

if __name__ == "__main__":
    main()
`;

const modules: Record<string, string> = {
  "telegram.ext": "python-telegram-bot>=21.6",
  telegram: "python-telegram-bot>=21.6",
  telebot: "pyTelegramBotAPI>=4.24",
  aiogram: "aiogram>=3.15",
  pyrogram: "pyrogram + TgCrypto",
  dotenv: "python-dotenv",
  PIL: "Pillow",
  requests: "requests",
  cv2: "opencv-python",
  pandas: "pandas",
  numpy: "numpy",
  openai: "openai",
  aiohttp: "aiohttp",
  gspread: "gspread",
};

type Step = 1 | 2 | 3;

export function NewBotModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { push } = useToast();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("Forge Helper");
  const [token, setToken] = useState("771234567:AAH8xQ2pLmN4vRtY6wZbC1dE3fG5hJ7kL9");
  const [code, setCode] = useState(sample);
  const [showToken, setShowToken] = useState(false);
  const [progress, setProgress] = useState(0);
  const [library, setLibrary] = useState("python-telegram-bot");
  const [botId] = useState(() => `b_${Math.random().toString(16).slice(2, 6)}`);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setProgress(0);
    }
  }, [open]);

  useEffect(() => {
    if (step !== 2) return;
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(id);
          return 100;
        }
        return Math.min(100, p + 7 + Math.random() * 9);
      });
    }, 130);
    return () => clearInterval(id);
  }, [step]);

  const imports = useMemo(() => {
    const found = new Set<string>();
    const re = /^(?:from|import)\s+([a-zA-Z0-9_.]+)/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code))) {
      const root = m[1].split(".")[0];
      if (m[1].startsWith("telegram")) found.add(m[1].startsWith("telegram.ext") ? "telegram.ext" : "telegram");
      else found.add(root);
    }
    return [...found].map((mod) => ({ mod, pypi: modules[mod] ?? mod }));
  }, [code]);

  const handlers = useMemo(() => {
    const cmds = [...code.matchAll(/CommandHandler\(\s*["']([\w_-]+)["']/g)].map((m) => `/${m[1]}`);
    const aiogram = [...code.matchAll(/Command\(\s*["']([\w_-]+)["']/g)].map((m) => `/${m[1]}`);
    const telebot = [...code.matchAll(/commands=\[\s*["']([\w_-]+)["']/g)].map((m) => `/${m[1]}`);
    const list = [...new Set([...cmds, ...aiogram, ...telebot])];
    if (/MessageHandler|@dp\.message\(\)|func=lambda/.test(code)) list.push("echo");
    return list;
  }, [code]);

  useEffect(() => {
    if (imports.some((i) => i.pypi.startsWith("aiogram"))) setLibrary("aiogram");
    else if (imports.some((i) => i.pypi.startsWith("pyTelegramBotAPI"))) setLibrary("pyTelegramBotAPI");
    else if (imports.some((i) => i.pypi.startsWith("python-telegram-bot"))) setLibrary("python-telegram-bot");
    else if (imports.some((i) => i.pypi.startsWith("pyrogram"))) setLibrary("pyrogram");
  }, [imports]);

  if (!open) return null;

  const tokenValid = /^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(token.trim());
  const canContinue = name.trim().length > 2 && tokenValid && code.trim().length > 20;

  const deploy = () => {
    push({
      kind: "success",
      title: `${name} is live`,
      body: `setWebhook → /api/tg/${botId} · ${handlers.length} handlers compiled`,
    });
    onClose();
    router.push("/admin/logs");
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-[6vh] backdrop-blur-sm">
      <div className="w-full max-w-[720px] animate-rise overflow-hidden rounded-xl border border-line bg-panel shadow-pop">
        <div className="flex items-center justify-between border-b border-line/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/15 text-brand">
              <Zap size={14} />
            </span>
            <div>
              <h2 className="text-[13px] font-semibold text-ink">Deploy a new bot</h2>
              <p className="text-[10.5px] text-faint">Paste Python · we compile imports and register the webhook</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost h-7 px-2 text-[11px]">
            esc
          </button>
        </div>

        {/* stepper */}
        <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5">
          {[
            { n: 1, label: "Source & token", icon: Code2 },
            { n: 2, label: "Analyse & compile", icon: ScanLine },
            { n: 3, label: "Live", icon: Rocket },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold",
                  step === s.n
                    ? "border-brand bg-brand text-[#04140f]"
                    : step > s.n
                      ? "border-brand/40 bg-brand/10 text-brand"
                      : "border-line bg-raised text-faint",
                )}
              >
                {step > s.n ? <Check size={10} /> : s.n}
              </span>
              <span className={cn("text-[11px]", step === s.n ? "text-ink" : "text-faint")}>{s.label}</span>
              {i < 2 ? <span className="mx-1 h-px w-6 bg-line" /> : null}
            </div>
          ))}
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-4">
          {step === 1 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Bot name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" placeholder="My helper bot" />
                </div>
                <div>
                  <label className="label">Bot token · @BotFather</label>
                  <div className="relative mt-1">
                    <KeyRound size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
                    <input
                      value={token}
                      type={showToken ? "text" : "password"}
                      onChange={(e) => setToken(e.target.value)}
                      className="input pl-8 pr-14 font-mono text-[11.5px]"
                      placeholder="123456:ABC-DEF…"
                    />
                    <button
                      onClick={() => setShowToken((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-faint hover:text-ink"
                    >
                      {showToken ? "hide" : "show"}
                    </button>
                  </div>
                  <p className={cn("mt-1 text-[10px]", tokenValid ? "text-[#4fdfb0]" : "text-[#f7c66b]")}>
                    {tokenValid ? "✓ token format valid · stored in env vault" : "token must look like 771234567:AA…"}
                  </p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">main.py</label>
                  <div className="flex items-center gap-2 text-[10px] text-faint">
                    <span>{code.split("\n").length} lines</span>
                    <button onClick={() => setCode(sample)} className="hover:text-ink">
                      load template
                    </button>
                  </div>
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  className="mt-1 h-[210px] w-full resize-none rounded-lg border border-line bg-[#080b12] p-3 font-mono text-[11px] leading-relaxed text-[#c3cfdf] outline-none focus:border-brand/50"
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-line bg-canvas/50 p-3">
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="flex items-center gap-1.5 text-ink">
                    <Loader2 size={12} className={cn("text-brand", progress < 100 && "animate-spin")} />
                    {progress < 100 ? "Compiling behaviour…" : "Compile complete"}
                  </span>
                  <span className="font-mono text-[11px] text-faint">{Math.round(progress)}%</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-brand transition-[width] duration-150" style={{ width: `${progress}%` }} />
                </div>
                <pre className="mt-2.5 whitespace-pre-wrap font-mono text-[10.5px] leading-relaxed text-[#8ea7c9]">
{`› analysing main.py · ${handlers.length} handlers · ${imports.length} imports
› resolved requirements: ${imports.map((i) => i.pypi).join(" · ") || "none"}
› compiled behaviour: ${handlers.join(" · ") || "no handlers detected"}
${progress >= 100 ? `› getMe → @forge_echo_bot · ok (118 ms)\n› setWebhook → /api/tg/${botId} · registered` : "› waiting for compiler…"}`}
                </pre>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-line bg-canvas/40 p-3">
                  <div className="label">Detected imports → PyPI</div>
                  <div className="mt-2 space-y-1.5">
                    {imports.length === 0 ? <p className="text-[11px] text-faint">No imports parsed yet.</p> : null}
                    {imports.map((i) => (
                      <div key={i.mod} className="flex items-center justify-between gap-2 font-mono text-[10.5px]">
                        <span className="text-muted">{i.mod}</span>
                        <span className="truncate text-brand">{i.pypi}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-line bg-canvas/40 p-3">
                  <div className="label">Compiled handlers</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {handlers.length === 0 ? <p className="text-[11px] text-faint">No handlers parsed yet.</p> : null}
                    {handlers.map((h) => (
                      <span key={h} className="chip px-1.5 py-0.5 font-mono text-[10px] text-[#8ea7c9]">
                        {h}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px]">
                    <Cpu size={10} className="text-[#b3a8ff]" /> engine target:{" "}
                    <span className="font-mono text-ink">{library}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#f5b544]/25 bg-[#f5b544]/[0.06] p-2.5 text-[10.5px] text-[#f7c66b]">
                Token is masked in every log line. Secrets live in the per-bot env vault and are never written to the
                buffer.
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-brand">
                <CheckCircle2 size={26} />
              </span>
              <h3 className="mt-3 text-[15px] font-semibold text-ink">{name} is live</h3>
              <p className="mt-1 max-w-sm text-[11.5px] text-muted">
                Telegram is pushing updates to <span className="font-mono text-[11px] text-ink">/api/tg/{botId}</span>. Send
                /start to the bot to see the first line land in the console.
              </p>
              <div className="mt-4 grid w-full max-w-md grid-cols-3 gap-2 text-left">
                {[
                  { k: "handlers", v: String(handlers.length) },
                  { k: "imports", v: String(imports.length) },
                  { k: "compile", v: "1.8s" },
                ].map((s) => (
                  <div key={s.k} className="rounded-lg border border-line bg-canvas/40 p-2">
                    <div className="font-mono text-[13px] text-ink">{s.v}</div>
                    <div className="text-[9.5px] uppercase tracking-wide text-faint">{s.k}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line/80 px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-[10.5px] text-faint">
            <Terminal size={10} /> {library} · {handlers.length} handlers
          </div>
          <div className="flex items-center gap-2">
            {step > 1 ? (
              <button onClick={() => setStep((s) => (s - 1) as Step)} className="btn h-8 text-[11.5px]">
                <ArrowLeft size={12} /> Back
              </button>
            ) : null}
            {step === 1 ? (
              <button
                disabled={!canContinue}
                onClick={() => setStep(2)}
                className="btn-primary h-8 text-[11.5px] disabled:opacity-50"
              >
                Analyse code <ArrowRight size={12} />
              </button>
            ) : null}
            {step === 2 ? (
              <button
                disabled={progress < 100}
                onClick={() => setStep(3)}
                className="btn-primary h-8 text-[11.5px] disabled:opacity-50"
              >
                <Rocket size={12} /> Register webhook
              </button>
            ) : null}
            {step === 3 ? (
              <button onClick={deploy} className="btn-primary h-8 text-[11.5px]">
                <Check size={12} /> Open live logs
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

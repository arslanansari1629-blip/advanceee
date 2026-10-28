import Link from "next/link";
import { currentUser } from "@/lib/auth";
import NoticeBar from "@/components/NoticeBar";
import { getPlatformSettings } from "@/lib/settings";
import {
  IconActivity,
  IconBolt,
  IconCheck,
  IconCloud,
  IconGithub,
  IconLock,
  IconPlay,
  IconRobot,
  IconShield,
  IconSpark,
  IconTerminal,
} from "@/components/icons";

const features = [
  {
    icon: IconSpark,
    title: "Requirements auto-detected",
    body: "Paste code and BotForge parses every import, maps module names to real PyPI distributions (telebot → pyTelegramBotAPI, PIL → Pillow) and writes requirements.txt for you. Every PyPI library is supported.",
  },
  {
    icon: IconBolt,
    title: "Version pins that actually work",
    body: "python-telegram-bot v13 and v21 have incompatible APIs. Your source is analysed and the correct major version is pinned automatically, so old tutorials don't crash.",
  },
  {
    icon: IconTerminal,
    title: "Live logs, real output",
    body: "Every Telegram update, every compiled reply and every Bot API error streams into the console in real time. Filter, search, pause and download the buffer.",
  },
  {
    icon: IconShield,
    title: "Always on, self-healing",
    body: "Telegram pushes each update and the engine answers inline. There is no process to crash and no runner to attach — if an instance is cold, Telegram retries.",
  },
  {
    icon: IconCloud,
    title: "Unlimited free bots",
    body: "No per-bot pricing, no queue limits, no card. Deploy as many Telegram bots as you want — python-telegram-bot, aiogram or pyTelegramBotAPI code.",
  },
  {
    icon: IconLock,
    title: "Tokens never leak",
    body: "Bot tokens are detected on paste and masked everywhere in the UI. Secrets live in per-bot env vars, never in the log stream.",
  },
];

const steps = [
  ["Paste your Python", "Drop the whole file in the editor — or load a template for PTB, aiogram or pyTelegramBotAPI."],
  ["We detect & compile", "Imports become a pinned requirements list and your handlers are compiled into an executable behaviour spec."],
  ["Bot goes live 24/7", "We call setWebhook, Telegram starts pushing updates here, and replies go out instantly — from the site itself."],
];

const mappings = [
  ["import telebot", "pyTelegramBotAPI"],
  ["from telegram.ext import Application", "python-telegram-bot>=21.6"],
  ["from telegram.ext import Updater", "python-telegram-bot==13.15"],
  ["from pyrogram import Client", "pyrogram + TgCrypto"],
  ["from aiogram import Dispatcher", "aiogram>=3.15"],
  ["from PIL import Image", "Pillow"],
  ["import cv2", "opencv-python"],
  ["import pandas as pd", "pandas"],
];

export default async function Landing() {
  const user = await currentUser();
  const platform = await getPlatformSettings();

  return (
    <div className="relative mx-auto max-w-6xl px-5 pb-24">
      {(platform.maintenance || platform.broadcast) && (
        <div className="pt-4">
          <NoticeBar
            maintenance={platform.maintenance}
            maintenanceMessage={platform.maintenanceMessage}
            broadcast={platform.broadcast}
          />
        </div>
      )}

      {/* nav */}
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 text-black">
            <IconRobot size={19} />
          </div>
          <div>
            <p className="text-[15px] font-semibold leading-tight text-white">
              BotForge <span className="text-cyan-300">Cloud</span>
            </p>
            <p className="mono text-[10px] uppercase tracking-[0.16em] text-slate-500">python · 24/7 · free</p>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <a
            href="https://github.com/arslanansari1629-blip/advanceee"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
          >
            <IconGithub size={14} /> Source
          </a>
          <Link href={user ? "/console" : "/login"} className="btn btn-primary">
            {user ? "Open console" : "Launch console"} <IconPlay size={12} />
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.01] px-6 py-14 text-center fade-in sm:px-12">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11.5px] font-semibold text-cyan-200">
          <span className="dot dot-live" /> unlimited bots · no card · free forever
        </div>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
          <span className="text-grad">Paste Python.</span>
          <br />
          Your Telegram bot goes live.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-400">
          BotForge reads your handlers, detects every library you import, registers your Telegram webhook and
          answers every message instantly — 24/7, with live logs and one-click control. No server, no runner.
          Host as many bots as you want, free forever.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={user ? "/console/new" : "/login?mode=register"} className="btn btn-primary !px-5 !py-2.5 !text-sm">
            <IconBolt size={15} /> Deploy a bot in 30 seconds
          </Link>
          <Link href="/login?demo=1" className="btn !px-5 !py-2.5 !text-sm">
            Explore the live demo console
          </Link>
        </div>
        <p className="mt-4 text-[11.5px] text-slate-500">
          No install. No CLI. Your code never leaves your account.
        </p>

        {/* mini terminal */}
        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-xl border border-white/10 bg-[#04060c]/85 text-left shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            <span className="mono ml-2 text-[10.5px] text-slate-500">botforge · echo-bot · logs</span>
            <span className="pill ml-auto !text-[10px] border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <span className="dot dot-live" /> LIVE
            </span>
          </div>
          <div className="logs px-3 py-3 text-[12px]">
            <p className="log-sys">› analysing main.py · 3 handlers · 2 imports</p>
            <p className="log-sys">› resolved requirements: python-telegram-bot&gt;=21.6 · python-dotenv</p>
            <p className="log-sys">› compiled behaviour: /start · /help · /price · echo</p>
            <p className="log-tg">getMe → @forge_echo_bot · ok (118 ms)</p>
            <p className="log-tg">setWebhook → /api/tg/b_7f31… · registered</p>
            <p className="log-out">update “/start” from @arslan (Arslan) · chat 771234567</p>
            <p className="log-sys">engine · command /start</p>
            <p className="log-out">reply → “Hey Arslan! I am live 24/7.” (41 ms)</p>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="glass group p-5 transition-colors hover:border-cyan-400/25">
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-cyan-300">
              <f.icon size={17} />
            </div>
            <h3 className="text-[14.5px] font-semibold text-white">{f.title}</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">{f.body}</p>
          </div>
        ))}
      </section>

      {/* mapping table */}
      <section className="mt-16 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass p-6">
          <h2 className="text-xl font-semibold tracking-tight text-white">Import → PyPI, resolved automatically</h2>
          <p className="mt-1.5 text-[12.5px] text-slate-400">
            The analyser ships a mapping for 250+ popular modules and falls back to the module name, which is
            correct for almost every package on PyPI.
          </p>
          <div className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.07]">
            {mappings.map(([code, pkg]) => (
              <div key={code} className="flex items-center justify-between gap-3 bg-white/[0.02] px-3 py-2">
                <code className="mono truncate text-[11.5px] text-slate-300">{code}</code>
                <span className="mono shrink-0 text-[11.5px] font-semibold text-cyan-300">{pkg}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-6">
          <h2 className="text-xl font-semibold tracking-tight text-white">Three steps, no YAML</h2>
          <ol className="mt-4 space-y-4">
            {steps.map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-[12px] font-bold text-cyan-300">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-white">{title}</p>
                  <p className="text-[12px] leading-relaxed text-slate-400">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.03] p-3.5">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-slate-400">
              <IconCheck size={12} className="text-emerald-400" /> what you get
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-1.5 text-[12px] text-slate-300">
              {["Live update logs", "Pause / restart / recompile", "Inline buttons & callbacks", "Env var vault", "Unlimited bots", "Fleet analytics"].map(
                (x) => (
                  <li key={x} className="flex items-center gap-1.5">
                    <IconCheck size={11} className="text-emerald-400" /> {x}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* honesty */}
      <section className="mt-16 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-6">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-emerald-100">
          <IconActivity size={16} /> How hosting really works (no marketing)
        </h2>
        <div className="mt-3 grid gap-4 text-[12.5px] leading-relaxed text-emerald-100/80 sm:grid-cols-2">
          <p>
            Instead of keeping a Python process alive, BotForge registers a{" "}
            <strong>Telegram webhook</strong> for your bot. Telegram then delivers every message to this
            deployment the moment it happens, and the engine answers with a direct Bot API call — so your bot
            is reachable <strong>24/7 with nothing running in the background</strong>.
          </p>
          <p>
            No runner, no VPS, no container, no card. Paste Python, add the token from @BotFather, press
            deploy. Your handlers (<code className="mono rounded bg-black/40 px-1 py-0.5 text-[11px]">/start</code>,{" "}
            <code className="mono rounded bg-black/40 px-1 py-0.5 text-[11px]">/help</code>, custom commands,
            echoes and inline buttons) are compiled into the engine and answered exactly as you wrote them.
          </p>
        </div>
      </section>

      {/* cta */}
      <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 p-10 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Your bot is one paste away</h2>
        <p className="mx-auto mt-2 max-w-xl text-[13px] text-slate-400">
          Unlimited bots. Unlimited logs. Unlimited restarts. Free forever.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/login?mode=register" className="btn btn-primary !px-5 !py-2.5 !text-sm">
            Create free account
          </Link>
          <Link href="/login?demo=1" className="btn !px-5 !py-2.5 !text-sm">
            Sign in to the demo workspace
          </Link>
        </div>
      </section>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-6 text-[11.5px] text-slate-500">
        <p>BotForge Cloud · built for people who ship bots, not YAML.</p>
        <div className="flex items-center gap-4">
          <a className="hover:text-slate-300" href="https://github.com/arslanansari1629-blip/advanceee" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link className="hover:text-slate-300" href="/console">
            Console
          </Link>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

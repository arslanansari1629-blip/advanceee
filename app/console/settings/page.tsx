"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconActivity,
  IconCheck,
  IconCloud,
  IconGlobe,
  IconLock,
  IconRobot,
  IconShield,
  IconWarn,
} from "@/components/icons";
import { Banner, CopyBtn, cx } from "@/components/ui";

export default function Settings() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMe);
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const site = health?.siteUrl ?? (typeof window !== "undefined" ? window.location.origin : "");

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Settings</h1>
        <p className="text-[12.5px] text-slate-500">
          Account, engine endpoints and storage. There is nothing to install or host yourself — the bots run
          inside this app.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <IconShield size={12} /> account
          </p>
          <div className="mt-2.5 space-y-2 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">email</span>
              <span className="mono text-slate-200">{me?.user?.email ?? "…"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">name</span>
              <span className="text-slate-200">{me?.user?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">plan</span>
              <span className="pill !py-0 !text-[10px] border-emerald-400/30 text-emerald-300">unlimited · free forever</span>
            </div>
          </div>
          <button className="btn mt-3 !py-1.5 !text-[11.5px]" onClick={logout}>
            Sign out
          </button>
        </div>

        <div className="glass p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <IconRobot size={12} /> engine
          </p>
          <div className="mt-2.5 space-y-2 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">mode</span>
              <span className="mono text-emerald-300">{health?.mode ?? "webhook-engine"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">runner</span>
              <span className="mono text-slate-300">none</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">storage</span>
              <span className="mono text-slate-300">{health?.storage ?? "…"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">health</span>
              <span className="mono text-emerald-300">{health?.ok ? "ok" : "…"}</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10.5px] uppercase tracking-wider text-slate-500">webhook base</p>
            <div className="mt-1 flex items-center gap-1.5">
              <code className="mono min-w-0 flex-1 truncate rounded-md border border-white/[0.07] bg-black/30 px-2 py-1.5 text-[11px] text-cyan-200">
                {site}/api/tg/&lt;botId&gt;
              </code>
              <CopyBtn text={`${site}/api/tg/<botId>`} label="Copy" />
            </div>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-500">
              Each bot has its own secret-token URL, generated on deploy. You never need to paste it anywhere.
            </p>
          </div>
        </div>
      </div>

      <div className="glass p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <IconCloud size={12} /> how 24/7 works without a runner
        </p>
        <div className="mt-2.5 grid gap-3 md:grid-cols-3">
          {[
            {
              t: "Telegram calls us",
              d: "On deploy we call getMe + setWebhook. Telegram then pushes every message to this deployment instantly.",
            },
            {
              t: "We answer inline",
              d: "Your compiled handlers render the reply and the endpoint calls sendMessage. Sub-second, no queue, no worker.",
            },
            {
              t: "Nothing to keep alive",
              d: "There is no process to crash and no polling loop to restart. Telegram retries if an instance is cold.",
            },
          ].map((x, i) => (
            <div key={x.t} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <span className="mono text-[10px] text-cyan-400">0{i + 1}</span>
              <p className="mt-0.5 text-[12.5px] font-semibold text-white">{x.t}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{x.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <IconLock size={12} /> security
        </p>
        <ul className="mt-2 space-y-1.5 text-[11.5px] text-slate-400">
          {[
            "Bot tokens are encrypted with AES-256-GCM before they touch storage.",
            "Every webhook call is authenticated with x-telegram-bot-api-secret-token.",
            "Tokens are never returned by any API route — only a masked preview.",
            "Sessions are signed httpOnly cookies.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-1.5">
              <IconCheck size={11} className="mt-0.5 shrink-0 text-emerald-400" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <Banner
        tone={health?.storage === "postgres" ? "success" : "warn"}
        title={health?.storage === "postgres" ? "Durable storage connected" : "Storage is ephemeral on this deployment"}
      >
        {health?.storage === "postgres" ? (
          <>
            Bots, logs and events persist across restarts in Postgres. Your fleet survives every cold start.
          </>
        ) : (
          <>
            Bot state currently lives in a JSON file inside the serverless instance, so the dashboard can reset on a
            cold start. Your bots still answer on Telegram. Add a <code className="mono">DATABASE_URL</code> (free
            Neon or Supabase) in the Vercel project settings to make every bot, log and event permanent.
          </>
        )}
      </Banner>

      <div className="flex items-center gap-1.5 text-[10.5px] text-slate-600">
        <IconActivity size={11} /> {health?.service ?? "botforge-cloud"} v{health?.version ?? "2.0.0"} ·{" "}
        <IconGlobe size={11} /> {site || "—"}
      </div>
    </div>
  );
}

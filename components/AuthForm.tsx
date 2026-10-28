"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconBolt, IconCheck, IconGithub, IconRobot } from "./icons";
import { cx } from "./ui";

export default function AuthForm({ initialMode, autoDemo }: { initialMode: "login" | "register"; autoDemo?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState(autoDemo ? "demo@botforge.dev" : "");
  const [password, setPassword] = useState(autoDemo ? "botforge123" : "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(credentials?: { email: string; password: string }) {
    setBusy(true);
    setError(null);
    const payload = credentials ?? { email, password, name };
    try {
      const path = credentials || mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(credentials ? "/api/auth/login" : path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      router.push("/console");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-10 lg:grid-cols-[1fr_420px] lg:items-center">
      <div className="hidden lg:block">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 text-black">
            <IconRobot size={20} />
          </div>
          <div>
            <p className="text-[16px] font-semibold text-white">BotForge Cloud</p>
            <p className="mono text-[10px] uppercase tracking-[0.18em] text-slate-500">python runtime · 24/7</p>
          </div>
        </Link>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white">
          One paste from a<br />
          <span className="text-grad">permanently online bot.</span>
        </h1>
        <p className="mt-3 max-w-md text-[13px] leading-relaxed text-slate-400">
          Requirements are detected from your imports, installed for you, and the process is supervised with live
          logs. Unlimited bots, free forever.
        </p>
        <ul className="mt-7 space-y-2.5">
          {[
            "Auto-detected requirements + correct version pins",
            "Live stdout / stderr / gateway log stream",
            "Stop, restart, redeploy and crash-loop detection",
            "Unlimited bots, unlimited logs, no card",
          ].map((t) => (
            <li key={t} className="flex items-center gap-2 text-[12.5px] text-slate-300">
              <IconCheck size={13} className="text-emerald-400" /> {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="glass w-full p-6">
        <div className="mb-5 flex rounded-lg border border-white/10 bg-black/30 p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={cx(
                "flex-1 rounded-md py-1.5 text-[12.5px] font-semibold transition-colors",
                mode === m ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {mode === "register" && (
            <div>
              <label className="label">Your name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Arslan" />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="at least 6 characters"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[12px] text-rose-200">
              {error}
            </p>
          )}

          <button className="btn btn-primary w-full !py-2.5" disabled={busy}>
            {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[10.5px] uppercase tracking-wider text-slate-600">
          <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          className="btn w-full"
          disabled={busy}
          onClick={() => submit({ email: "demo@botforge.dev", password: "botforge123" })}
        >
          <IconBolt size={13} /> Enter demo workspace
        </button>
        <p className="mt-2 text-center text-[10.5px] text-slate-500">
          demo@botforge.dev · botforge123 — pre-loaded with 6 bots
        </p>

        <a
          href="https://github.com/arslanansari1629-blip/advanceee"
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300"
        >
          <IconGithub size={12} /> source on GitHub
        </a>
      </div>
    </div>
  );
}

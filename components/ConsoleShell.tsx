"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconBolt,
  IconCloud,
  IconGithub,
  IconGrid,
  IconPlus,
  IconRobot,
  IconSettings,
  IconTerminal,
} from "./icons";
import { cx } from "./ui";

interface Me {
  user: { id: string; name: string; email: string; plan: string } | null;
  runnerUrl?: string | null;
}

const nav = [
  { href: "/console", label: "Overview", icon: IconGrid },
  { href: "/console/new", label: "Deploy bot", icon: IconPlus },
  { href: "/console/settings", label: "Runner & settings", icon: IconSettings },
  { href: "/console/setup", label: "Host 24/7 setup", icon: IconBolt },
];

export default function ConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [runner, setRunner] = useState<{ connected: boolean; mode: string; latencyMs?: number; error?: string } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [a, b] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/runner", { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (!alive) return;
        setMe(a);
        setRunner(b.runner);
      } catch {
        /* offline */
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen">
      {/* sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r border-white/[0.07] bg-black/30 px-3 py-4 backdrop-blur-xl lg:flex">
        <Link href="/console" className="mb-6 flex items-center gap-2.5 px-1.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 text-black">
            <IconRobot size={18} />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold leading-tight text-white">BotForge</p>
            <p className="mono text-[9px] uppercase tracking-[0.16em] text-slate-500">cloud console</p>
          </div>
        </Link>

        <Link href="/console/new" className="btn btn-primary mb-4 w-full !py-2 !text-[12.5px]">
          <IconPlus size={14} /> New bot
        </Link>

        <nav className="space-y-0.5">
          {nav.map((item) => {
            const active =
              item.href === "/console" ? pathname === "/console" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors",
                  active ? "bg-white/[0.08] text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                )}
              >
                <item.icon size={14} /> {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <IconCloud size={11} /> runtime
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px]">
            <span className={cx("dot", runner?.connected ? "dot-live" : "dot-warn")} />
            <span className={runner?.connected ? "text-emerald-300" : "text-amber-300"}>
              {runner?.connected ? "Runner connected" : "Preview mode"}
            </span>
          </div>
          <p className="mt-1 truncate text-[10.5px] text-slate-500">
            {runner?.connected ? `${runner.latencyMs ?? 0} ms · ${me?.runnerUrl ?? "platform runner"}` : "attach a runner for real processes"}
          </p>
          {!runner?.connected && (
            <Link href="/console/setup" className="mt-2 block text-[10.5px] font-semibold text-cyan-300 hover:underline">
              Run the setup guide →
            </Link>
          )}
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-cyan-400/80 to-violet-500/80 text-[11px] font-bold text-black">
              {(me?.user?.name ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-semibold text-white">{me?.user?.name ?? "…"}</p>
              <p className="truncate text-[10px] text-slate-500">{me?.user?.email}</p>
            </div>
            <button onClick={logout} className="text-[10px] font-semibold text-slate-500 hover:text-rose-300">
              Exit
            </button>
          </div>
          <div className="flex items-center justify-between px-1 text-[10px] text-slate-600">
            <a
              href="https://github.com/arslanansari1629-blip/advanceee"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-slate-400"
            >
              <IconGithub size={11} /> source
            </a>
            <span className="pill !py-0 !text-[9.5px] border-white/10">unlimited · free</span>
          </div>
        </div>
      </aside>

      {/* main */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.07] bg-[#06070c]/80 px-4 py-3 backdrop-blur-xl">
          <Link href="/console" className="flex items-center gap-2 lg:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 text-black">
              <IconRobot size={16} />
            </div>
            <span className="text-[13px] font-semibold text-white">BotForge</span>
          </Link>
          <div className="hidden items-center gap-2 text-[12px] text-slate-500 lg:flex">
            <IconTerminal size={13} />
            <span className="text-slate-400">console</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300">
              {pathname === "/console"
                ? "overview"
                : pathname.startsWith("/console/new")
                ? "deploy"
                : pathname.startsWith("/console/bots")
                ? "bot detail"
                : pathname.startsWith("/console/setup")
                ? "host 24/7"
                : "settings"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={cx(
                "pill hidden sm:inline-flex",
                runner?.connected
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-200"
              )}
            >
              <span className={cx("dot", runner?.connected ? "dot-live" : "dot-warn")} />
              {runner?.connected ? "runner online" : "preview mode"}
            </span>
            <Link href="/console/new" className="btn btn-primary !py-1.5 !text-[12px]">
              <IconBolt size={13} /> Deploy
            </Link>
          </div>
        </header>
        <main className="px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

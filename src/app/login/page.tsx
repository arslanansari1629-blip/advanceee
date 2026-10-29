import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Activity, Bot, ShieldCheck, Terminal, Zap } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { SESSION_COOKIE, isAuthConfigured, readSession } from "@/lib/auth";
import { PRODUCT_BASE, isProductConfigured } from "@/lib/product";

export const metadata: Metadata = { title: "Sign in · BotForge Admin" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; e?: string; out?: string };
}) {
  const session = await readSession(cookies().get(SESSION_COOKIE)?.value);
  if (session) redirect(searchParams.next?.startsWith("/admin") ? searchParams.next : "/admin");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #34e0a1 0%, transparent 70%)" }}
      />

      <div className="relative grid w-full max-w-[880px] overflow-hidden rounded-2xl border border-line bg-panel shadow-pop lg:grid-cols-[1.05fr_1fr]">
        {/* brand / context */}
        <div className="relative hidden flex-col justify-between gap-6 border-r border-line/80 bg-gradient-to-br from-raised/60 to-panel p-7 lg:flex">
          <div>
            <Link href="/login" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#34e0a1] to-[#0e9f74] text-[#04140f] shadow-glow">
                <Zap size={17} strokeWidth={2.6} />
              </span>
              <span>
                <span className="block text-[14px] font-semibold leading-tight text-ink">BotForge</span>
                <span className="block text-[10px] uppercase tracking-[0.16em] text-faint">admin cloud</span>
              </span>
            </Link>

            <h1 className="mt-7 text-[22px] font-semibold leading-snug tracking-[-0.02em] text-ink">
              The console behind
              <br />
              every live bot.
            </h1>
            <p className="mt-2 max-w-[300px] text-[12px] leading-relaxed text-muted">
              A read-through view of the live BotForge Cloud product: bots, accounts, platform flags and engine
              diagnostics. Nothing is stored here.
            </p>

            <div className="mt-5 space-y-2">
              {[
                { icon: Bot, text: "Every bot and account, read from the product" },
                { icon: Activity, text: "Statuses, restarts and faults as they are stored" },
                { icon: Terminal, text: "Platform flags written straight back" },
                { icon: ShieldCheck, text: "No fixtures — an empty product shows empty screens" },
              ].map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.text} className="flex items-center gap-2 text-[11.5px] text-muted">
                    <span className="flex h-5 w-5 items-center justify-center rounded border border-line bg-canvas/60 text-brand">
                      <Icon size={10} />
                    </span>
                    {row.text}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-line/80 bg-canvas/50 p-3 font-mono text-[10px] leading-relaxed text-[#8ea7c9]">
            <div className="text-faint">› POST /api/admin/login</div>
            <div className="text-faint">› GET&nbsp; /api/admin/data</div>
            <div className="text-[#5eeac0]">› render → live payload, no local copy</div>
          </div>
        </div>

        {/* form */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#34e0a1] to-[#0e9f74] text-[#04140f]">
              <Zap size={15} strokeWidth={2.6} />
            </span>
            <span className="text-[13.5px] font-semibold text-ink">BotForge Admin</span>
          </div>

          <div className="mt-4 lg:mt-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
              <span className="h-1 w-1 rounded-full bg-brand" /> restricted access
            </span>
            <h2 className="mt-2.5 text-[19px] font-semibold tracking-[-0.02em] text-ink">Sign in</h2>
            <p className="mt-1 text-[12px] text-muted">
              Sign in with the BotForge operator credentials — the product issues the session this console reads with.
            </p>
          </div>

          <LoginForm configured={isAuthConfigured() || isProductConfigured()} loggedOut={Boolean(searchParams.out)} />

          <div className="mt-5 flex items-center justify-between border-t border-line/70 pt-3 text-[10.5px] text-faint">
            <a href={PRODUCT_BASE} className="truncate transition-colors hover:text-ink">
              ← {PRODUCT_BASE.replace(/^https?:\/\//, "")}
            </a>
            <span className="flex items-center gap-1">
              <ShieldCheck size={10} /> protected surface
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

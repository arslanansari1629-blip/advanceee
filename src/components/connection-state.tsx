import Link from "next/link";
import { ArrowUpRight, Cable, LockKeyhole, RefreshCw, ServerCrash, ShieldAlert, Terminal } from "lucide-react";
import type { AdminState } from "@/lib/types";
import { Card, Mono } from "./ui";

/**
 * Three honest failure modes. The console never falls back to sample numbers:
 * if live data is missing it says so and offers the one action that fixes it.
 */
export function ConnectionState({ state }: { state: Exclude<AdminState, { state: "ok" }> }) {
  const host = state.baseUrl.replace(/^https?:\/\//, "");
  const next = "/admin";

  const config = {
    unlinked: {
      icon: Cable,
      tone: "#8b7cff",
      title: "This session is not linked to the product",
      body: "The console reads everything from the live BotForge API, so it needs a product operator session. Sign in with the product's operator credentials. If the product rejects them, set BOTFORGE_OPERATOR_USERNAME / BOTFORGE_OPERATOR_PASSWORD on this deployment and redeploy.",
      action: { label: "Sign in to the product", href: `/login?next=${encodeURIComponent(next)}` },
    },
    unauthorized: {
      icon: LockKeyhole,
      tone: "#f5b544",
      title: "The product rejected the operator session",
      body: "The product token behind this console session has expired or was revoked. Sign in again to mint a fresh one — no data is cached anywhere.",
      action: { label: "Re-authenticate", href: `/login?next=${encodeURIComponent(next)}` },
    },
    unreachable: {
      icon: ServerCrash,
      tone: "#ff5d6c",
      title: "The product did not answer",
      body: "No figures are shown because none could be fetched. This page is a live view, not a mirror.",
      action: null,
    },
  }[state.state];

  const Icon = config.icon;

  return (
    <Card className="overflow-hidden">
      <div className="relative flex flex-wrap items-start gap-4 border-b border-line/70 p-5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
          style={{
            borderColor: `color-mix(in oklab, ${config.tone} 32%, transparent)`,
            background: `color-mix(in oklab, ${config.tone} 14%, transparent)`,
            color: config.tone,
          }}
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-ink">{config.title}</h2>
            <span className="chip py-0.5">
              <span className="h-1 w-1 rounded-full" style={{ background: config.tone }} />
              {state.state}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted">{config.body}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={next} className="btn h-8 text-[12px]">
            <RefreshCw size={13} /> Retry
          </Link>
          {config.action ? (
            <Link href={config.action.href} className="btn-primary h-8 text-[12px]">
              {config.action.label} <ArrowUpRight size={13} />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-px bg-line/60 sm:grid-cols-2">
        <div className="bg-panel p-4">
          <p className="label">Product endpoint</p>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink">
            <Terminal size={12} className="text-faint" />
            <Mono>https://{host}/api/admin/data</Mono>
          </p>
        </div>
        <div className="bg-panel p-4">
          <p className="label">Detail</p>
          <p className="mt-1 break-words text-[12px] text-muted">
            {state.state === "unreachable"
              ? state.error
              : state.state === "unlinked"
                ? "No bf_operator token in this console session."
                : "401 from the product operator API."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line/70 bg-raised/30 px-5 py-3 text-[11px] text-faint">
        <ShieldAlert size={12} />
        Wrong data is worse than no data — this console has no local fixtures to fall back on.
      </div>
    </Card>
  );
}

/** Small inline banner used inside otherwise-live pages. */
export function StaleNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#f5b544]/25 bg-[#f5b544]/[0.07] px-3 py-2 text-[11.5px] text-[#f7c66b]">
      <ShieldAlert size={13} /> {children}
    </div>
  );
}

import Link from "next/link";
import {
  ArrowUpRight,
  Cable,
  Check,
  CircleAlert,
  Clock,
  Database,
  Fingerprint,
  KeyRound,
  Lock,
  Radio,
  Server,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react";
import { CopyButton, RefreshButton } from "@/components/refresh-button";
import { Badge, Card, CardHead, Divider, Mono, PageHeader } from "@/components/ui";
import { isAuthConfigured } from "@/lib/auth";
import { PRODUCT_BASE, fetchProductHealth, isProductConfigured } from "@/lib/product";
import { getSession, loadAdminState } from "@/lib/session";
import { clockUTC, dateAt, stampUTC } from "@/lib/format";

export const dynamic = "force-dynamic";

function Fact({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: "ok" | "bad" | "warn" | "neutral";
}) {
  return (
    <div className="bg-panel p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-faint">
        {icon} {label}
      </p>
      <p
        className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-medium"
        style={{
          color:
            tone === "ok" ? "#5eeac0" : tone === "bad" ? "#ff929c" : tone === "warn" ? "#f7c66b" : "rgb(var(--ink))",
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default async function SystemPage() {
  const now = Date.now();
  const [state, session, health] = await Promise.all([loadAdminState(), getSession(), fetchProductHealth()]);

  const endpoints = [
    { method: "GET", path: "/api/admin/data", note: "accounts, bots, stats, settings", live: state.state === "ok" },
    { method: "POST", path: "/api/admin/settings", note: "maintenance, broadcast, signups", live: state.state === "ok" },
    { method: "GET", path: "/api/admin/login", note: "operator session (console uses POST)", live: state.state === "ok" },
    { method: "GET", path: "/api/health", note: "service version and runner mode", live: health.ok },
  ];

  return (
    <>
      <PageHeader
        eyebrow="diagnostics"
        title="System"
        subtitle="Connectivity, session and data-source facts for this console. No counts are shown here — this page exists to explain where the numbers on the other pages come from."
        actions={
          <>
            <RefreshButton label="Re-probe" />
            <Link href="/admin" className="btn h-8 text-[12px]">
              Back to overview
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact
          icon={<Cable size={11} />}
          label="Product link"
          value={
            state.state === "ok" ? (
              <>
                <Check size={12} /> linked · {state.latencyMs} ms
              </>
            ) : state.state === "unreachable" ? (
              <>
                <X size={12} /> unreachable
              </>
            ) : (
              <>
                <X size={12} /> {state.state}
              </>
            )
          }
          tone={state.state === "ok" ? "ok" : "bad"}
        />
        <Fact
          icon={<Radio size={11} />}
          label="Engine"
          value={state.state === "ok" ? `${state.data.engine.mode} · ${state.data.engine.online ? "online" : "offline"}` : "unknown"}
          tone={state.state === "ok" ? (state.data.engine.online ? "ok" : "warn") : "neutral"}
        />
        <Fact
          icon={<Database size={11} />}
          label="Data source"
          value={state.state === "ok" ? `${state.data.storage} adapter` : "no payload"}
          tone={state.state === "ok" ? "ok" : "neutral"}
        />
        <Fact
          icon={<Clock size={11} />}
          label="Probe time"
          value={<Mono>{clockUTC(now)}Z</Mono>}
          tone="neutral"
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHead
            title="Connection"
            subtitle="Where this console reads from"
            action={<Badge tone={isProductConfigured() ? "success" : "danger"}>{isProductConfigured() ? "configured" : "missing env"}</Badge>}
          />
          <div className="grid gap-px bg-line/50 sm:grid-cols-2">
            <Fact icon={<Server size={11} />} label="Product base URL" value={<Mono>{PRODUCT_BASE}</Mono>} />
            <Fact
              icon={<Terminal size={11} />}
              label="BOTFORGE_API_URL"
              value={process.env.BOTFORGE_API_URL ? "set on this deployment" : "unset — using the default"}
              tone={process.env.BOTFORGE_API_URL ? "ok" : "warn"}
            />
            <Fact
              icon={<Database size={11} />}
              label="Storage"
              value={state.state === "ok" ? state.data.storage : "—"}
            />
            <Fact
              icon={<Radio size={11} />}
              label="Webhook engine"
              value={state.state === "ok" ? (state.data.engine.online ? "online" : "offline") : "—"}
              tone={state.state === "ok" ? (state.data.engine.online ? "ok" : "warn") : "neutral"}
            />
          </div>
          <div className="border-t border-line/60 px-4 py-3">
            <p className="label">Product health endpoint</p>
            {health.ok ? (
              <div className="mt-1.5 grid grid-cols-2 gap-y-1 text-[11.5px] sm:grid-cols-3">
                <span className="text-faint">service</span>
                <span className="text-ink sm:col-span-2">{health.data.service}</span>
                <span className="text-faint">version</span>
                <span className="text-ink sm:col-span-2">{health.data.version}</span>
                <span className="text-faint">mode</span>
                <span className="text-ink sm:col-span-2">{health.data.mode}</span>
                <span className="text-faint">runner</span>
                <span className="text-ink sm:col-span-2">{health.data.runner}</span>
                <span className="text-faint">site</span>
                <span className="truncate text-ink sm:col-span-2">{health.data.siteUrl}</span>
              </div>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[#ff929c]">
                <CircleAlert size={11} /> {health.reason === "unauthorized" ? "health endpoint requires auth" : health.detail ?? health.reason}
              </p>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHead
            title="Console session"
            subtitle="The signed cookie this browser carries"
            action={<Badge tone={session?.op ? "success" : session ? "warn" : "danger"}>{session?.op ? "linked" : session ? "unlinked" : "none"}</Badge>}
          />
          <div className="px-4 pb-4 pt-1">
            {session ? (
              <>
                <div className="flex items-center justify-between border-b border-line/60 py-2 text-[11.5px]">
                  <span className="text-faint">Operator</span>
                  <span className="text-ink">
                    {session.name} ({session.user})
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-line/60 py-2 text-[11.5px]">
                  <span className="flex items-center gap-1 text-faint">
                    <KeyRound size={10} /> Product token
                  </span>
                  <span className={session.op ? "text-[#5eeac0]" : "text-[#f7c66b]"}>
                    {session.op ? "bf_operator present" : "not linked"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-line/60 py-2 text-[11.5px]">
                  <span className="flex items-center gap-1 text-faint">
                    <Cable size={10} /> Established via
                  </span>
                  <span className="text-ink">{session.via === "product" ? "product login" : "local credentials"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-line/60 py-2 text-[11.5px]">
                  <span className="flex items-center gap-1 text-faint">
                    <Clock size={10} /> Issued
                  </span>
                  <span className="text-ink">{stampUTC(session.iat * 1000)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-line/60 py-2 text-[11.5px]">
                  <span className="flex items-center gap-1 text-faint">
                    <Clock size={10} /> Expires
                  </span>
                  <span className="text-ink">
                    {dateAt(session.exp * 1000)} · {stampUTC(session.exp * 1000)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 text-[11.5px]">
                  <span className="flex items-center gap-1 text-faint">
                    <Fingerprint size={10} /> Cookie
                  </span>
                  <span className="font-mono text-[11px] text-muted">bf_admin_session · HS256</span>
                </div>
                <form action="/api/auth/logout" method="post" className="mt-2">
                  <button className="btn h-8 w-full text-[11.5px]">Sign out of this console</button>
                </form>
              </>
            ) : (
              <p className="py-6 text-[11.5px] text-faint">No session cookie was presented.</p>
            )}
            <Divider className="my-3" />
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 text-faint">
                <Lock size={10} /> Local fallback credentials
              </span>
              <span className={isAuthConfigured() ? "text-[#5eeac0]" : "text-faint"}>
                {isAuthConfigured() ? "configured (values never exposed)" : "not configured"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-3 overflow-hidden">
        <CardHead
          title="Endpoints the console calls"
          subtitle="Every screen is a thin read over this product API"
          action={<ShieldCheck size={14} className="text-faint" />}
        />
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="border-y border-line/60 bg-raised/30">
                <th className="th w-16">Method</th>
                <th className="th">Path</th>
                <th className="th">Purpose</th>
                <th className="th text-right">This session</th>
                <th className="th w-8" />
              </tr>
            </thead>
            <tbody>
              {endpoints.map((e) => (
                <tr key={e.path} className="border-b border-line/40 last:border-0">
                  <td className="td">
                    <span
                      className="rounded border px-1.5 py-0.5 font-mono text-[10px]"
                      style={{
                        borderColor: e.method === "GET" ? "rgb(76 201 240 / 0.3)" : "rgb(139 124 255 / 0.3)",
                        color: e.method === "GET" ? "#7edcf7" : "#b3a8ff",
                      }}
                    >
                      {e.method}
                    </span>
                  </td>
                  <td className="td">
                    <span className="flex items-center gap-1 font-mono text-[11.5px] text-ink">
                      {e.path}
                      <CopyButton value={`${PRODUCT_BASE}${e.path}`} />
                    </span>
                  </td>
                  <td className="td text-[11.5px]">{e.note}</td>
                  <td className="td text-right">
                    {e.live ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#5eeac0]">
                        <Check size={10} /> reachable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#ff929c]">
                        <X size={10} /> failed
                      </span>
                    )}
                  </td>
                  <td className="td text-right">
                    <a href={`${PRODUCT_BASE}${e.path}`} target="_blank" rel="noreferrer" className="text-faint hover:text-ink">
                      <ArrowUpRight size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line/60 px-4 py-2.5 text-[10.5px] text-faint">
          The console holds no database, no cache and no fixtures — delete the product and every screen in this console
          goes empty.
        </div>
      </Card>

      <p className="mt-4 text-[10.5px] text-faint">
        Probe {stampUTC(now)} · console build {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"} ·
        node {process.version}
      </p>
    </>
  );
}

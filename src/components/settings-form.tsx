"use client";

import { useState } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
  Copy,
  Gauge,
  Globe2,
  KeyRound,
  Lock,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Webhook,
} from "lucide-react";
import { Badge, Card, Divider } from "./ui";
import { useToast } from "./toast";
import { cn } from "@/lib/format";

const tabs = [
  { key: "workspace", label: "Workspace", icon: Building2 },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "limits", label: "Limits & quotas", icon: Gauge },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "keys", label: "API keys", icon: KeyRound },
  { key: "danger", label: "Danger zone", icon: Trash2 },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 py-3 last:border-0">
      <div className="min-w-0 max-w-[62%]">
        <p className="text-[12.5px] font-medium text-ink">{title}</p>
        {description ? <p className="mt-0.5 text-[11px] leading-relaxed text-faint">{description}</p> : null}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label?: string }) {
  return (
    <button onClick={onChange} className="flex items-center gap-2 text-[11px] text-muted">
      {label ? <span>{label}</span> : null}
      <span
        className={cn(
          "relative h-[18px] w-[32px] rounded-full border transition-colors",
          on ? "border-brand/40 bg-brand/80" : "border-line bg-line/80",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-[12px] w-[12px] rounded-full bg-white transition-transform",
            on ? "translate-x-[16px]" : "translate-x-[2px]",
          )}
        />
      </span>
    </button>
  );
}

export function SettingsForm() {
  const { push } = useToast();
  const [tab, setTab] = useState<TabKey>("workspace");
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState({
    name: "BotForge Cloud",
    slug: "botforge-cloud",
    region: "iad1",
    tz: "UTC",
    support: "support@botforge.cloud",
    docs: "https://botforge-cloud.vercel.app/docs",
    enforce2fa: true,
    sessionTtl: "12",
    ipAllowlist: "103.21.58.0/24",
    sso: false,
    maxBotsFree: "3",
    maxBotsPro: "15",
    maxBotsScale: "50",
    retention: "30",
    rateLimit: "30",
    coldStart: true,
    emailOn: true,
    slackOn: true,
    webhookOn: false,
    slackUrl: "https://hooks.slack.com/services/T0…/B0…/xxx",
    digest: "daily",
  });

  const set = (k: keyof typeof form, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const save = () => {
    setDirty(false);
    push({ kind: "success", title: "Settings saved", body: "Applied to the edge config · propagated to 5 regions" });
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
      <nav className="panel h-fit p-1.5 lg:col-span-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors",
                tab === t.key ? "bg-brand/10 text-ink" : "text-muted hover:bg-raised/70 hover:text-ink",
              )}
            >
              <Icon size={13} className={tab === t.key ? "text-brand" : "text-faint"} />
              {t.label}
              {tab === t.key ? <span className="ml-auto h-1 w-1 rounded-full bg-brand" /> : null}
            </button>
          );
        })}
        <Divider className="my-1.5" />
        <div className="px-2.5 py-1.5 text-[10px] leading-relaxed text-faint">
          Config version <span className="font-mono text-muted">v2026.10.29-3</span> · deployed 41m ago
        </div>
      </nav>

      <div className="lg:col-span-3">
        <Card className="p-4">
          {tab === "workspace" ? (
            <>
              <h2 className="text-[13.5px] font-semibold text-ink">Workspace</h2>
              <p className="text-[11.5px] text-faint">Identity shown on invoices, emails and the hosted status page.</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Workspace name</label>
                  <input value={form.name} onChange={(e) => set("name", e.target.value)} className="input mt-1" />
                </div>
                <div>
                  <label className="label">Slug</label>
                  <input value={form.slug} onChange={(e) => set("slug", e.target.value)} className="input mt-1 font-mono text-[11.5px]" />
                </div>
                <div>
                  <label className="label">Primary region</label>
                  <select value={form.region} onChange={(e) => set("region", e.target.value)} className="input mt-1">
                    {["iad1", "fra1", "bom1", "sin1", "sfo1"].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <select value={form.tz} onChange={(e) => set("tz", e.target.value)} className="input mt-1">
                    {["UTC", "Asia/Kolkata", "Europe/Berlin", "America/New_York"].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Support email</label>
                  <input value={form.support} onChange={(e) => set("support", e.target.value)} className="input mt-1" />
                </div>
                <div>
                  <label className="label">Docs URL</label>
                  <input value={form.docs} onChange={(e) => set("docs", e.target.value)} className="input mt-1" />
                </div>
              </div>
              <Divider className="my-4" />
              <Row title="Public status page" description="botforge-cloud.vercel.app/status · shows incidents and uptime.">
                <Badge tone="success">live</Badge>
                <button className="btn h-7 text-[11px]">Open</button>
              </Row>
              <Row title="Custom domain" description="Serve the console and webhook gateway on your own domain.">
                <Badge>not configured</Badge>
                <button className="btn h-7 text-[11px]">Add domain</button>
              </Row>
            </>
          ) : null}

          {tab === "security" ? (
            <>
              <h2 className="text-[13.5px] font-semibold text-ink">Security</h2>
              <p className="text-[11.5px] text-faint">Everything here is enforced at the edge before any handler runs.</p>
              <div className="mt-2">
                <Row title="Enforce 2FA for admins" description="Owners and admins must enrol TOTP before touching a bot.">
                  <Toggle on={form.enforce2fa} onChange={() => set("enforce2fa", !form.enforce2fa)} />
                </Row>
                <Row title="Session lifetime" description="Hours before an idle console session is revoked.">
                  <input
                    value={form.sessionTtl}
                    onChange={(e) => set("sessionTtl", e.target.value)}
                    className="input h-8 w-20 text-center font-mono text-[11.5px]"
                  />
                  <span className="text-[10.5px] text-faint">hours</span>
                </Row>
                <Row title="IP allowlist" description="Console access restricted to these CIDR blocks.">
                  <input
                    value={form.ipAllowlist}
                    onChange={(e) => set("ipAllowlist", e.target.value)}
                    className="input h-8 w-[170px] font-mono text-[11px]"
                  />
                </Row>
                <Row title="Workspace SSO (SAML)" description="Scale plan only · Okta, Azure AD, Google Workspace.">
                  <Badge tone="accent">scale</Badge>
                  <Toggle on={form.sso} onChange={() => set("sso", !form.sso)} />
                </Row>
                <Row title="Secret masking" description="Bot tokens and API keys are redacted in logs, exports and support views.">
                  <Badge tone="success">always on</Badge>
                </Row>
                <Row title="Audit retention" description="Every privileged action is hash-chained and retained.">
                  <Badge tone="info">400 days</Badge>
                </Row>
              </div>
            </>
          ) : null}

          {tab === "limits" ? (
            <>
              <h2 className="text-[13.5px] font-semibold text-ink">Limits & quotas</h2>
              <p className="text-[11.5px] text-faint">Soft limits trigger an upsell; hard limits return 429 with a retry-after.</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { k: "maxBotsFree", label: "Free · bots" },
                  { k: "maxBotsPro", label: "Pro · bots" },
                  { k: "maxBotsScale", label: "Scale · bots" },
                ].map((f) => (
                  <div key={f.k}>
                    <label className="label">{f.label}</label>
                    <input
                      value={form[f.k as "maxBotsFree"]}
                      onChange={(e) => set(f.k as "maxBotsFree", e.target.value)}
                      className="input mt-1 font-mono text-[11.5px]"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <Row title="Log retention" description="Days of log buffer kept queryable per bot.">
                  <select value={form.retention} onChange={(e) => set("retention", e.target.value)} className="input h-8 w-24">
                    {["7", "30", "90", "400"].map((r) => (
                      <option key={r} value={r}>
                        {r} days
                      </option>
                    ))}
                  </select>
                </Row>
                <Row title="Bot API rate limit" description="Requests per second per bot, enforced by the proxy.">
                  <input
                    value={form.rateLimit}
                    onChange={(e) => set("rateLimit", e.target.value)}
                    className="input h-8 w-20 text-center font-mono text-[11.5px]"
                  />
                  <span className="text-[10.5px] text-faint">req/s</span>
                </Row>
                <Row title="Cold-start keep-warm" description="Ping edge functions every 90s in busy regions.">
                  <Toggle on={form.coldStart} onChange={() => set("coldStart", !form.coldStart)} />
                </Row>
              </div>
              <div className="mt-2 rounded-lg border border-line/70 bg-canvas/40 p-2.5">
                <div className="label">Current consumption</div>
                <div className="mt-1.5 grid grid-cols-3 gap-2 text-center">
                  {[
                    { k: "updates / mo", v: "1.24M" },
                    { k: "bots", v: "34" },
                    { k: "log storage", v: "3.8 GB" },
                  ].map((s) => (
                    <div key={s.k}>
                      <div className="font-mono text-[13px] text-ink">{s.v}</div>
                      <div className="text-[9.5px] uppercase tracking-wide text-faint">{s.k}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {tab === "notifications" ? (
            <>
              <h2 className="text-[13.5px] font-semibold text-ink">Notifications</h2>
              <p className="text-[11.5px] text-faint">Where the console pings a human when something breaks.</p>
              <div className="mt-2">
                <Row title="Email alerts" description="Incidents, abuse reports and failed payments.">
                  <Toggle on={form.emailOn} onChange={() => set("emailOn", !form.emailOn)} />
                </Row>
                <Row title="Slack" description="Posts to #botforge-alerts with runbook links.">
                  <Toggle on={form.slackOn} onChange={() => set("slackOn", !form.slackOn)} />
                </Row>
                <Row title="Generic webhook" description="POST a signed JSON payload to your own endpoint.">
                  <Toggle on={form.webhookOn} onChange={() => set("webhookOn", !form.webhookOn)} />
                </Row>
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <label className="label">Slack webhook URL</label>
                  <div className="mt-1 flex gap-2">
                    <input value={form.slackUrl} onChange={(e) => set("slackUrl", e.target.value)} className="input font-mono text-[11px]" />
                    <button
                      onClick={() => push({ kind: "success", title: "Test message sent", body: "#botforge-alerts · 200 OK" })}
                      className="btn h-9 shrink-0 text-[11px]"
                    >
                      <Webhook size={11} /> Test
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Digest cadence</label>
                  <select value={form.digest} onChange={(e) => set("digest", e.target.value)} className="input mt-1 w-40">
                    {["realtime", "hourly", "daily", "weekly"].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["incident.created", "incident.resolved", "bot.compile_failed", "quota.near", "invoice.failed", "abuse.report"].map((e) => (
                  <span key={e} className="chip font-mono text-[9.5px]">
                    <CheckCircle2 size={9} className="text-brand" /> {e}
                  </span>
                ))}
              </div>
            </>
          ) : null}

          {tab === "keys" ? (
            <>
              <h2 className="text-[13.5px] font-semibold text-ink">API keys</h2>
              <p className="text-[11.5px] text-faint">Machine access to the admin REST API. Scoped, rotatable and audited.</p>
              <div className="mt-3 space-y-1.5">
                {[
                  { name: "ci-deployer", scope: "read/write", last: "12m ago", key: "bf_live_sk_9f31…c41f" },
                  { name: "grafana-readonly", scope: "read", last: "3h ago", key: "bf_live_sk_77ab…9e02" },
                  { name: "cli-arslan", scope: "read/write", last: "yesterday", key: "bf_live_sk_2c4d…11aa" },
                ].map((k) => (
                  <div key={k.name} className="flex flex-wrap items-center gap-2 rounded-lg border border-line/70 bg-canvas/40 p-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand/10 text-brand">
                      <KeyRound size={11} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11.5px] font-medium text-ink">{k.name}</div>
                      <div className="font-mono text-[10px] text-faint">{k.key}</div>
                    </div>
                    <Badge tone={k.scope === "read" ? "neutral" : "warn"}>{k.scope}</Badge>
                    <span className="text-[10px] text-faint">used {k.last}</span>
                    <button
                      onClick={() => push({ kind: "success", title: "Copied", body: `${k.name} key copied (masked)` })}
                      className="btn h-6 px-1.5 text-[10px]"
                    >
                      <Copy size={10} />
                    </button>
                    <button
                      onClick={() => push({ kind: "error", title: "Key revoked", body: `${k.name} · integrations will 401` })}
                      className="btn-danger h-6 px-1.5 text-[10px]"
                    >
                      revoke
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => push({ kind: "success", title: "Key created", body: "bf_live_sk_… copied to your clipboard" })}
                className="btn mt-2 h-8 text-[11px]"
              >
                <Plus size={11} /> Create key
              </button>
              <Divider className="my-3" />
              <div className="label">Example request</div>
              <pre className="mt-1.5 overflow-x-auto rounded-md border border-line/70 bg-[#080b12] p-2.5 font-mono text-[10px] leading-relaxed text-[#8ea7c9]">
{`curl -H "Authorization: Bearer $BF_ADMIN_KEY" \\
  https://botforge-cloud.vercel.app/api/admin/bots

# → { "bots": 34, "live": 15, "updates_24h": 1240318 }`}
              </pre>
            </>
          ) : null}

          {tab === "danger" ? (
            <>
              <h2 className="text-[13.5px] font-semibold text-[#ff929c]">Danger zone</h2>
              <p className="text-[11.5px] text-faint">Irreversible workspace operations. Everything is audited.</p>
              <div className="mt-3 space-y-2">
                {[
                  { t: "Pause every bot", d: "Drops all webhooks; Telegram buffers updates for 24h.", label: "Pause fleet" },
                  { t: "Rotate all secrets", d: "Revokes every bot token and API key, requires re-entry.", label: "Rotate secrets" },
                  { t: "Purge logs", d: "Deletes the entire log buffer and exports for this workspace.", label: "Purge logs" },
                  { t: "Delete workspace", d: "Removes bots, users, invoices and the audit log after 30 days.", label: "Delete" },
                ].map((r) => (
                  <div key={r.t} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#ff5d6c]/20 bg-[#ff5d6c]/[0.04] p-2.5">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-ink">{r.t}</p>
                      <p className="text-[10.5px] text-faint">{r.d}</p>
                    </div>
                    <button
                      onClick={() => push({ kind: "error", title: `${r.t} requested`, body: "Requires owner confirmation via email" })}
                      className="btn-danger h-7 text-[10.5px]"
                    >
                      {r.label}
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-faint">
                <Lock size={9} /> Protected by owner 2FA + email confirmation.
              </div>
            </>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
            <button onClick={save} disabled={!dirty} className="btn-primary h-8 text-[11.5px] disabled:opacity-40">
              <Save size={12} /> {dirty ? "Save changes" : "Saved"}
            </button>
            <button
              onClick={() => {
                setDirty(false);
                push({ kind: "info", title: "Changes discarded", body: "Restored the last deployed config" });
              }}
              disabled={!dirty}
              className="btn h-8 text-[11.5px] disabled:opacity-40"
            >
              Discard
            </button>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-faint">
              {dirty ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f5b544]" /> unsaved changes
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" /> in sync with production
                </>
              )}
            </span>
          </div>
        </Card>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line/70 bg-panel/60 p-3 text-[10.5px] text-faint">
          <Globe2 size={11} />
          Config is deployed to 5 edge regions. Changes roll out in ~8s with automatic rollback on probe failure.
        </div>
      </div>
    </div>
  );
}

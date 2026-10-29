import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Mail, MapPin, Receipt, ShieldCheck, Sparkles, UserCog } from "lucide-react";
import { ActionButton } from "@/components/actions";
import { Avatar, Badge, Card, CardHead, PlanBadge, Progress, StatusBadge } from "@/components/ui";
import { bots, invoices, ownerBots, users } from "@/lib/data";
import { fmt, money, relTime, shortDate } from "@/lib/format";

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const user = users.find((u) => u.id === params.id);
  if (!user) notFound();
  const userBots = ownerBots(user.id);
  const userInvoices = invoices.filter((i) => i.email === user.email).slice(0, 5);
  const limit = user.plan === "scale" ? 800_000 : user.plan === "pro" ? 250_000 : 30_000;

  return (
    <>
      <Link href="/admin/users" className="mb-3 inline-flex items-center gap-1.5 text-[11.5px] text-faint transition-colors hover:text-ink">
        <ArrowLeft size={12} /> Back to users
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Avatar name={user.name} color={user.color} size={52} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">{user.name}</h1>
              <PlanBadge plan={user.plan} />
              <Badge tone={user.role === "owner" ? "success" : user.role === "admin" ? "accent" : "info"}>{user.role}</Badge>
              <Badge tone={user.status === "active" ? "success" : user.status === "suspended" ? "danger" : "neutral"}>
                {user.status}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-faint">
              <span className="flex items-center gap-1">
                <Mail size={10} /> {user.email}
              </span>
              <span className="font-mono text-[11px] text-muted">{user.telegram}</span>
              <span className="flex items-center gap-1">
                <MapPin size={10} /> {user.country}
              </span>
              <span>{user.id}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton label="Email" icon={<Mail size={12} />} kind="success" title="Email queued" body={`Delivered to ${user.email}`} />
          <ActionButton
            label="Impersonate"
            icon={<UserCog size={12} />}
            kind="info"
            title="Impersonation started"
            body="15 minute session · audit logged"
          />
          <ActionButton
            label={user.status === "suspended" ? "Unsuspend" : "Suspend"}
            icon={<ShieldCheck size={12} />}
            kind="warn"
            title={user.status === "suspended" ? "Account restored" : "Account suspended"}
            body="Console access revoked · bots keep answering"
            variant="danger"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <Card>
            <CardHead title="Bots" subtitle={`${userBots.length} deployed · ${fmt(userBots.reduce((a, b) => a + b.updates24h, 0))} updates today`} action={<Badge tone="info">{user.plan}</Badge>} />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-y border-line/70 bg-canvas/30">
                    <th className="th">Bot</th>
                    <th className="th">Status</th>
                    <th className="th">Library</th>
                    <th className="th text-right">Updates 24h</th>
                    <th className="th text-right">Success</th>
                  </tr>
                </thead>
                <tbody>
                  {userBots.map((b) => (
                    <tr key={b.id} className="border-b border-line/50 last:border-0 hover:bg-raised/40">
                      <td className="td">
                        <Link href={`/admin/bots/${b.id}`} className="text-[12.5px] text-ink hover:text-brand">
                          {b.name}
                          <span className="ml-1.5 font-mono text-[10px] text-faint">{b.slug}</span>
                        </Link>
                      </td>
                      <td className="td"><StatusBadge status={b.status} /></td>
                      <td className="td text-[11px]">{b.library}</td>
                      <td className="td text-right font-mono text-[11.5px] text-ink">{fmt(b.updates24h)}</td>
                      <td className="td text-right font-mono text-[11.5px]">{b.successRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {userBots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="td text-center text-faint">
                        No bots deployed yet — <Link href="/admin/bots?new=1" className="link">deploy the first</Link>.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHead title="Invoices" subtitle="Billing history · Stripe sync" action={<Badge tone="success">current</Badge>} />
            <div className="mt-2 divide-y divide-line/60">
              {userInvoices.length === 0 ? (
                <p className="px-4 py-6 text-center text-[11.5px] text-faint">No invoices — this account is on the free plan.</p>
              ) : null}
              {userInvoices.map((i) => (
                <div key={i.id} className="flex items-center gap-3 px-4 py-2">
                  <Receipt size={12} className="text-faint" />
                  <span className="font-mono text-[11px] text-muted">{i.id}</span>
                  <span className="text-[11px] text-faint">{shortDate(i.date)}</span>
                  <span className="ml-auto font-mono text-[11.5px] text-ink">{money(i.amount, { cents: true })}</span>
                  <Badge tone={i.status === "paid" ? "success" : i.status === "failed" ? "danger" : "warn"}>{i.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="text-[13px] font-semibold text-ink">Usage this cycle</h3>
            <div className="mt-2.5 space-y-3">
              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted">Updates</span>
                  <span className="font-mono text-ink">{fmt(user.updates)} / {fmt(limit)}</span>
                </div>
                <div className="mt-1"><Progress value={(user.updates / limit) * 100} /></div>
              </div>
              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted">Bots</span>
                  <span className="font-mono text-ink">{user.bots} / {user.plan === "scale" ? 50 : user.plan === "pro" ? 15 : 3}</span>
                </div>
                <div className="mt-1"><Progress value={(user.bots / (user.plan === "scale" ? 50 : user.plan === "pro" ? 15 : 3)) * 100} color="#8b7cff" /></div>
              </div>
              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted">Log retention</span>
                  <span className="font-mono text-ink">{user.plan === "free" ? "7d" : user.plan === "pro" ? "30d" : "90d"}</span>
                </div>
                <div className="mt-1"><Progress value={user.plan === "free" ? 25 : user.plan === "pro" ? 60 : 95} color="#4cc9f0" /></div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-[13px] font-semibold text-ink">Account</h3>
            <div className="mt-2 space-y-1.5 text-[11.5px]">
              {[
                { k: "joined", v: shortDate(user.joined) },
                { k: "last seen", v: relTime(user.lastSeen) },
                { k: "MRR", v: user.mrr ? money(user.mrr) : "—" },
                { k: "country", v: user.country },
                { k: "2FA", v: "enabled · TOTP" },
                { k: "sessions", v: `${2 + (user.bots % 3)} devices` },
              ].map((r) => (
                <div key={r.k} className="flex items-center justify-between">
                  <span className="text-faint">{r.k}</span>
                  <span className="text-muted">{r.v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <ActionButton label="Change plan" icon={<Sparkles size={11} />} kind="success" title="Plan changed" body="Prorated invoice created" className="h-8 text-[11px]" />
              <ActionButton label="Reset 2FA" icon={<ShieldCheck size={11} />} kind="warn" title="2FA reset link sent" body="30 minute TTL" className="h-8 text-[11px]" />
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <Bot size={12} className="text-brand" /> Notes
            </h3>
            <textarea
              placeholder="Internal note about this account…"
              className="mt-2 h-20 w-full resize-none rounded-lg border border-line bg-canvas/50 p-2 text-[11.5px] text-muted outline-none focus:border-brand/50"
            />
            <ActionButton label="Save note" kind="success" title="Note saved" body="Visible to admins only" className="mt-1.5 h-7 w-full text-[11px]" />
          </Card>
        </div>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Ban,
  Check,
  ChevronRight,
  Crown,
  LogIn,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { Avatar, Badge, PlanBadge, Progress, StatusBadge } from "./ui";
import { ExportButton } from "./actions";
import { useToast } from "./toast";
import { cn, fmt, money, stampUTC } from "@/lib/format";
import type { Bot, Plan, User } from "@/lib/types";

type Row = User & { botList: Bot[] };

const roleTone: Record<User["role"], "neutral" | "accent" | "info" | "success"> = {
  owner: "success",
  admin: "accent",
  member: "info",
  viewer: "neutral",
};

export function UsersTable({ rows }: { rows: Row[] }) {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState<Plan | "all">("all");
  const [role, setRole] = useState<User["role"] | "all">("all");
  const [status, setStatus] = useState<User["status"] | "all">("all");
  const [sort, setSort] = useState<{ key: "name" | "updates" | "mrr" | "joined"; dir: "asc" | "desc" }>({
    key: "updates",
    dir: "desc",
  });
  const [open, setOpen] = useState<Row | null>(null);
  const [invite, setInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<User["role"]>("member");
  const [overrides, setOverrides] = useState<Record<string, User["status"]>>({});

  const filtered = useMemo(() => {
    const list = rows.filter((u) => {
      if (plan !== "all" && u.plan !== plan) return false;
      if (role !== "all" && u.role !== role) return false;
      if (status !== "all" && (overrides[u.id] ?? u.status) !== status) return false;
      if (q && !`${u.name} ${u.email} ${u.telegram} ${u.country}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      if (sort.key === "name") return a.name.localeCompare(b.name) * dir;
      if (sort.key === "updates") return (a.updates - b.updates) * dir;
      if (sort.key === "mrr") return (a.mrr - b.mrr) * dir;
      return (new Date(a.joined).getTime() - new Date(b.joined).getTime()) * dir;
    });
  }, [rows, q, plan, role, status, sort, overrides]);

  const totals = {
    mrr: filtered.reduce((a, u) => a + u.mrr, 0),
    updates: filtered.reduce((a, u) => a + u.updates, 0),
    bots: filtered.reduce((a, u) => a + u.bots, 0),
  };

  const toggleSort = (key: typeof sort.key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  return (
    <>
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line/80 px-3 py-2.5">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, country…"
              className="h-8 w-[230px] rounded-lg border border-line bg-canvas/60 pl-7 pr-2 text-[12px] text-ink outline-none placeholder:text-faint focus:border-brand/50"
            />
          </div>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as Plan | "all")}
            className="h-8 rounded-lg border border-line bg-canvas/60 px-2 text-[11.5px] text-muted outline-none focus:border-brand/50"
          >
            <option value="all">all plans</option>
            <option value="free">free</option>
            <option value="pro">pro</option>
            <option value="scale">scale</option>
          </select>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as User["role"] | "all")}
            className="h-8 rounded-lg border border-line bg-canvas/60 px-2 text-[11.5px] text-muted outline-none focus:border-brand/50"
          >
            <option value="all">all roles</option>
            <option value="owner">owner</option>
            <option value="admin">admin</option>
            <option value="member">member</option>
            <option value="viewer">viewer</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as User["status"] | "all")}
            className="h-8 rounded-lg border border-line bg-canvas/60 px-2 text-[11.5px] text-muted outline-none focus:border-brand/50"
          >
            <option value="all">any status</option>
            <option value="active">active</option>
            <option value="invited">invited</option>
            <option value="suspended">suspended</option>
          </select>

          <div className="ml-auto flex items-center gap-1.5">
            <ExportButton
              filename="botforge-users.csv"
              rows={[
                ["id", "name", "email", "plan", "role", "status", "bots", "updates", "mrr", "joined"],
                ...filtered.map((u) => [u.id, u.name, u.email, u.plan, u.role, u.status, u.bots, u.updates, u.mrr, u.joined]),
              ]}
            />
            <button onClick={() => setInvite(true)} className="btn-primary h-8 text-[11.5px]">
              <Plus size={12} strokeWidth={2.6} /> Invite user
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-b border-line/70 bg-canvas/30 px-3 py-1.5 text-[10.5px] text-faint">
          <span>
            <span className="text-muted">{filtered.length}</span> accounts
          </span>
          <span>
            MRR <span className="font-mono text-muted">{money(totals.mrr)}</span>
          </span>
          <span>
            Bots <span className="font-mono text-muted">{totals.bots}</span>
          </span>
          <span>
            Updates <span className="font-mono text-muted">{fmt(totals.updates)}</span>
          </span>
          {(q || plan !== "all" || role !== "all" || status !== "all") && (
            <button
              onClick={() => {
                setQ("");
                setPlan("all");
                setRole("all");
                setStatus("all");
              }}
              className="ml-auto flex items-center gap-1 text-[#8fb3d9] hover:text-ink"
            >
              <X size={10} /> clear
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr className="border-b border-line/70 bg-canvas/30">
                <th className="th cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  <span className="flex items-center gap-1">Account <ArrowUpDown size={9} /></span>
                </th>
                <th className="th">Plan</th>
                <th className="th">Role</th>
                <th className="th">Status</th>
                <th className="th text-right">Bots</th>
                <th className="th cursor-pointer select-none text-right" onClick={() => toggleSort("updates")}>
                  <span className="flex items-center justify-end gap-1">Updates <ArrowUpDown size={9} /></span>
                </th>
                <th className="th text-right">MRR</th>
                <th className="th">Last seen</th>
                <th className="th w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setOpen(u)}
                  className="group cursor-pointer border-b border-line/50 transition-colors last:border-0 hover:bg-raised/40"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} color={u.color} size={28} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[12.5px] font-medium text-ink group-hover:text-brand">{u.name}</span>
                          {u.plan === "scale" && <Crown size={10} className="text-[#f5b544]" />}
                          {u.role === "owner" && <Badge tone="success" className="px-1 py-0 text-[9px]">you</Badge>}
                        </div>
                        <div className="truncate text-[10.5px] text-faint">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="td"><PlanBadge plan={u.plan} /></td>
                  <td className="td"><Badge tone={roleTone[u.role]}>{u.role}</Badge></td>
                  <td className="td">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]",
                        (overrides[u.id] ?? u.status) === "active"
                          ? "border-[#34e0a1]/25 bg-[#34e0a1]/10 text-[#5eeac0]"
                          : (overrides[u.id] ?? u.status) === "suspended"
                            ? "border-[#ff5d6c]/25 bg-[#ff5d6c]/10 text-[#ff929c]"
                            : "border-line bg-white/[0.04] text-muted",
                      )}
                    >
                      {overrides[u.id] ?? u.status}
                    </span>
                  </td>
                  <td className="td text-right font-mono text-[11.5px]">{u.bots}</td>
                  <td className="td text-right font-mono text-[11.5px] text-ink">{fmt(u.updates)}</td>
                  <td className="td text-right font-mono text-[11.5px]">{u.mrr ? money(u.mrr) : "—"}</td>
                  <td className="td whitespace-nowrap text-[11px]">{stampUTC(u.lastSeen)}</td>
                  <td className="px-2">
                    <ChevronRight size={13} className="text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-[12px] text-faint">No accounts match those filters.</div>
        ) : null}
      </div>

      {/* drawer */}
      {open ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setOpen(null)}>
          <div
            className="h-full w-full max-w-[430px] animate-rise overflow-y-auto border-l border-line bg-panel shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line/80 p-4">
              <div className="flex items-center gap-3">
                <Avatar name={open.name} color={open.color} size={44} />
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">{open.name}</h2>
                  <p className="text-[11.5px] text-faint">{open.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <PlanBadge plan={open.plan} />
                    <Badge tone={roleTone[open.role]}>{open.role}</Badge>
                    <span className="text-[10px] text-faint">{open.country}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(null)} className="rounded p-1 text-faint hover:text-ink">
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-3 divide-x divide-line/70 border-b border-line/70">
              {[
                { k: "bots", v: String(open.bots) },
                { k: "updates", v: fmt(open.updates) },
                { k: "MRR", v: open.mrr ? money(open.mrr) : "—" },
              ].map((s) => (
                <div key={s.k} className="px-3 py-2.5 text-center">
                  <div className="font-mono text-[14px] text-ink">{s.v}</div>
                  <div className="text-[9.5px] uppercase tracking-wide text-faint">{s.k}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3 p-4">
              <div>
                <div className="label">Quota · {open.plan} plan</div>
                <div className="mt-1.5">
                  <Progress
                    value={Math.min(100, (open.updates / (open.plan === "scale" ? 800_000 : open.plan === "pro" ? 250_000 : 30_000)) * 100)}
                    color={open.plan === "scale" ? "#34e0a1" : open.plan === "pro" ? "#8b7cff" : "#5c6880"}
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-faint">
                    <span>{fmt(open.updates)} updates/mo</span>
                    <span>{open.plan === "free" ? "30k limit" : open.plan === "pro" ? "250k limit" : "800k limit"}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="label mb-1.5">Bots ({open.botList.length})</div>
                <div className="space-y-1">
                  {open.botList.slice(0, 5).map((b) => (
                    <Link
                      key={b.id}
                      href={`/admin/bots/${b.id}`}
                      className="flex items-center gap-2 rounded-md border border-line/70 bg-canvas/40 px-2 py-1.5 hover:border-brand/30"
                    >
                      <span className="font-mono text-[10px] text-faint">{b.name.slice(0, 2)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] text-ink">{b.name}</span>
                        <span className="block truncate font-mono text-[9.5px] text-faint">{b.handle}</span>
                      </span>
                      <StatusBadge status={b.status} />
                    </Link>
                  ))}
                  {open.botList.length === 0 ? <p className="text-[11px] text-faint">No bots deployed yet.</p> : null}
                </div>
              </div>

              <div>
                <div className="label mb-1.5">Timeline</div>
                <div className="space-y-1.5 border-l border-line/70 pl-3">
                  {[
                    { t: "Signed in from " + open.country, at: stampUTC(open.lastSeen) },
                    { t: `Joined the workspace`, at: stampUTC(open.joined) },
                    { t: `Upgraded to ${open.plan}`, at: stampUTC(open.joined) },
                    { t: "Deployed first bot · forge starter", at: stampUTC(open.joined) },
                  ].map((e, i) => (
                    <div key={i} className="relative">
                      <span className="absolute -left-[17px] top-1.5 h-1.5 w-1.5 rounded-full bg-line" />
                      <p className="text-[11.5px] text-muted">{e.t}</p>
                      <p className="text-[10px] text-faint">{e.at}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 border-t border-line/70 pt-3">
                <button
                  onClick={() => push({ kind: "success", title: "Email queued", body: `Message sent to ${open.email}` })}
                  className="btn h-8 text-[11px]"
                >
                  <Mail size={11} /> Email user
                </button>
                <button
                  onClick={() => push({ kind: "info", title: "Impersonation session", body: "audit: impersonate.start · expires in 15m" })}
                  className="btn h-8 text-[11px]"
                >
                  <LogIn size={11} /> Impersonate
                </button>
                <button
                  onClick={() => push({ kind: "success", title: "Plan changed", body: `${open.name} → pro · prorated invoice created` })}
                  className="btn h-8 text-[11px]"
                >
                  <Sparkles size={11} /> Change plan
                </button>
                <button
                  onClick={() => push({ kind: "info", title: "Reset link sent", body: "password reset · 30 min TTL" })}
                  className="btn h-8 text-[11px]"
                >
                  <Send size={11} /> Reset access
                </button>
                <button
                  onClick={() => {
                    setOverrides((p) => ({ ...p, [open.id]: (overrides[open.id] ?? open.status) === "suspended" ? "active" : "suspended" }));
                    push({
                      kind: "warn",
                      title: (overrides[open.id] ?? open.status) === "suspended" ? "Account restored" : "Account suspended",
                      body: `${open.name} · bots keep running, console access revoked`,
                    });
                  }}
                  className="btn h-8 text-[11px]"
                >
                  <Ban size={11} /> {(overrides[open.id] ?? open.status) === "suspended" ? "Unsuspend" : "Suspend"}
                </button>
                <button
                  onClick={() => push({ kind: "error", title: "Deletion scheduled", body: "GDPR purge in 30 days · audit logged" })}
                  className="btn-danger h-8 text-[11px]"
                >
                  <Trash2 size={11} /> Delete
                </button>
              </div>
              <Link href={`/admin/users/${open.id}`} className="btn-ghost h-8 w-full text-[11px]">
                Open full profile <ChevronRight size={11} />
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* invite modal */}
      {invite ? (
        <div className="fixed inset-0 z-[75] flex items-start justify-center bg-black/60 p-4 pt-[14vh] backdrop-blur-sm" onClick={() => setInvite(false)}>
          <div className="w-full max-w-[420px] animate-rise rounded-xl border border-line bg-panel p-4 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-[13.5px] font-semibold text-ink">Invite to workspace</h3>
              <button onClick={() => setInvite(false)} className="text-faint hover:text-ink">
                <X size={14} />
              </button>
            </div>
            <p className="mt-1 text-[11.5px] text-faint">They get console access scoped to the role you pick.</p>
            <div className="mt-3 space-y-2">
              <div>
                <label className="label">Email</label>
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@company.com" className="input mt-1" />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as User["role"])}
                  className="input mt-1"
                >
                  <option value="admin">admin · full fleet control</option>
                  <option value="member">member · own bots only</option>
                  <option value="viewer">viewer · read-only</option>
                </select>
              </div>
            </div>
            <button
              disabled={!/^\S+@\S+\.\S+$/.test(inviteEmail)}
              onClick={() => {
                push({ kind: "success", title: "Invite sent", body: `${inviteEmail} · role ${inviteRole}` });
                setInvite(false);
                setInviteEmail("");
              }}
              className="btn-primary mt-3 w-full disabled:opacity-50"
            >
              <UserCheck size={12} /> Send invite
            </button>
            <p className="mt-2 flex items-center gap-1 text-[10px] text-faint">
              <Check size={9} /> Invites expire in 7 days · audit logged
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Bot as BotIcon,
  CircleAlert,
  CircleCheck,
  Clock,
  Cpu,
  FileCode2,
  KeyRound,
  MemoryStick,
  Package,
  Repeat2,
  ServerCog,
  ShieldCheck,
  User,
} from "lucide-react";
import { ConnectionState } from "@/components/connection-state";
import { CopyButton, RefreshButton } from "@/components/refresh-button";
import { Avatar, Badge, Card, CardHead, Divider, Mono, PageHeader, PlanBadge, Progress, StatusBadge } from "@/components/ui";
import { cn, dateAt, fmt, pct, since, splitRequirements, stampUTC, timeAgo } from "@/lib/format";
import { loadAdminState } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BotDetailPage({ params }: { params: { id: string } }) {
  const now = Date.now();
  const state = await loadAdminState();

  if (state.state !== "ok") {
    return (
      <>
        <PageHeader eyebrow="bot" title="Bot record" subtitle="Live product data only." />
        <ConnectionState state={state} />
      </>
    );
  }

  const { data, baseUrl } = state;
  const bot = data.bots.find((b) => b.id === params.id);
  if (!bot) notFound();

  const owner = data.users.find((u) => u.id === bot.ownerId);
  const siblings = data.bots.filter((b) => b.ownerId === bot.ownerId && b.id !== bot.id);
  const packages = splitRequirements(bot.requirements);
  const replyShare = bot.updates ? (bot.replies / bot.updates) * 100 : 0;

  const facts = [
    { label: "Updates", value: fmt(bot.updates), hint: "counted by the product" },
    { label: "Replies", value: fmt(bot.replies), hint: `${pct(replyShare, 0)} of updates` },
    { label: "Restarts", value: String(bot.restartCount), hint: bot.autoRestart ? "auto-restart on" : "auto-restart off" },
    { label: "Uptime", value: bot.stats.uptimePct ? pct(bot.stats.uptimePct) : "—", hint: `since ${bot.startedAt ? timeAgo(bot.startedAt, now) : "never started"}` },
  ];

  return (
    <>
      <Link href="/admin/bots" className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-faint transition-colors hover:text-ink">
        <ArrowLeft size={13} /> All bots
      </Link>

      <PageHeader
        eyebrow={`bot · ${bot.id}`}
        title={bot.name}
        subtitle={`${bot.framework || "unknown framework"} · ${bot.entry}${owner ? ` · owned by ${owner.name || owner.email}` : ""}`}
        actions={
          <>
            <RefreshButton label="Refresh" />
            <a href={`${baseUrl}/console/bots/${bot.id}`} target="_blank" rel="noreferrer" className="btn-primary h-8 text-[12px]">
              Manage on product <ArrowUpRight size={13} strokeWidth={2.6} />
            </a>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11.5px] text-faint">
        <StatusBadge status={bot.status} pulse />
        {bot.username ? <Badge tone="neutral">@{bot.username}</Badge> : <Badge tone="warn">no username</Badge>}
        <Badge tone={bot.autoRestart ? "success" : "neutral"}>{bot.autoRestart ? "auto-restart on" : "auto-restart off"}</Badge>
        <span className="flex items-center gap-1">
          <Clock size={11} /> created {dateAt(bot.createdAt)} ({timeAgo(bot.createdAt, now)})
        </span>
        <span className="flex items-center gap-1">
          <ServerCog size={11} /> started {bot.startedAt ? stampUTC(bot.startedAt) : "never"}
        </span>
        <CopyButton value={bot.id} label="copy id" className="ml-auto" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="panel p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint">{f.label}</p>
            <p className="mt-1.5 text-[22px] font-semibold leading-none text-ink">{f.value}</p>
            <p className="mt-2 text-[11px] text-faint">{f.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          <Card className="overflow-hidden">
            <CardHead
              title="Last reported error"
              subtitle="Exactly what the product stored on the bot record"
              action={
                <Badge tone={bot.lastError ? "danger" : "success"}>
                  {bot.lastError ? "failing" : "none recorded"}
                </Badge>
              }
            />
            <div className="px-5 pb-4 pt-3">
              {bot.lastError ? (
                <div className="rounded-lg border border-[#ff5d6c]/25 bg-[#ff5d6c]/[0.07] p-3">
                  <p className="flex items-start gap-2 font-mono text-[11.5px] leading-relaxed text-[#ffb3b9]">
                    <CircleAlert size={13} className="mt-0.5 shrink-0" />
                    {bot.lastError}
                  </p>
                  <p className="mt-2 text-[10.5px] text-[#ff929c]/80">
                    Fix it in the product console — this panel is read-only by design.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-[#34e0a1]/20 bg-[#34e0a1]/[0.06] p-3">
                  <CircleCheck size={14} className="text-brand" />
                  <p className="text-[12px] text-[#a9f3da]">No error is recorded for this bot.</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHead
              title="Deployment"
              subtitle="Fields the product keeps for this bot"
              action={<FileCode2 size={14} className="text-faint" />}
            />
            <div className="grid gap-px bg-line/50 sm:grid-cols-2">
              {[
                { label: "Entry point", value: <Mono>{bot.entry}</Mono>, icon: <FileCode2 size={11} /> },
                { label: "Framework", value: <Mono>{bot.framework || "unknown"}</Mono>, icon: <BotIcon size={11} /> },
                {
                  label: "Bot token",
                  value: (
                    <span className="flex items-center gap-1">
                      <Mono>{bot.tokenMasked ?? "not set"}</Mono>
                      {bot.tokenMasked ? <CopyButton value={bot.tokenMasked} /> : null}
                    </span>
                  ),
                  icon: <KeyRound size={11} />,
                },
                { label: "Bot id", value: <Mono>{bot.id}</Mono>, icon: <ShieldCheck size={11} /> },
                { label: "Created", value: `${dateAt(bot.createdAt)} · ${stampUTC(bot.createdAt)}`, icon: <Clock size={11} /> },
                { label: "Started", value: bot.startedAt ? `${dateAt(bot.startedAt)} · ${stampUTC(bot.startedAt)}` : "never", icon: <Clock size={11} /> },
              ].map((row) => (
                <div key={row.label} className="bg-panel p-3.5">
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-faint">
                    {row.icon} {row.label}
                  </p>
                  <div className="mt-1 text-[12px] text-ink">{row.value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHead
              title="Declared packages"
              subtitle={packages.length ? `${packages.length} requirement line${packages.length === 1 ? "" : "s"} on the record` : "The bot declares no requirements"}
              action={<Package size={14} className="text-faint" />}
            />
            <div className="px-5 pb-4 pt-3">
              {packages.length === 0 ? (
                <p className="text-[11.5px] text-faint">
                  requirements.txt is empty for this bot — the product installs nothing extra at build time.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {packages.map((p) => (
                    <span key={p} className="rounded-md border border-line bg-canvas/60 px-2 py-1 font-mono text-[11px] text-muted">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Card className="overflow-hidden">
            <CardHead title="Owner" subtitle="Account that deployed this bot" action={<User size={14} className="text-faint" />} />
            <div className="px-5 pb-4 pt-3">
              {owner ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={owner.name || owner.email} size={32} color="#8b7cff" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-ink">{owner.name || owner.email}</p>
                      <p className="truncate text-[11px] text-faint">{owner.email}</p>
                    </div>
                    <PlanBadge plan={owner.plan} />
                  </div>
                  <Divider className="my-3" />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Bots", value: owner.bots },
                      { label: "Live", value: owner.live },
                      { label: "Updates", value: owner.updates },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border border-line/70 bg-raised/40 py-2">
                        <p className="text-[14px] font-semibold text-ink">{fmt(s.value)}</p>
                        <p className="text-[9.5px] uppercase tracking-wide text-faint">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {siblings.length ? (
                    <>
                      <p className="label mt-3">Other bots from this owner</p>
                      <div className="mt-1 space-y-1">
                        {siblings.map((s) => (
                          <Link
                            key={s.id}
                            href={`/admin/bots/${s.id}`}
                            className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-[11.5px] text-muted transition-colors hover:bg-raised hover:text-ink"
                          >
                            <BotIcon size={11} className="text-faint" />
                            <span className="flex-1 truncate">{s.name}</span>
                            <StatusBadge status={s.status} />
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : null}
                </>
              ) : (
                <p className="text-[11.5px] text-faint">
                  Owner {bot.ownerId} was not in the user list returned with this snapshot.
                </p>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHead title="Measured by the product" subtitle="Uptime, CPU and memory for this bot" action={<Cpu size={14} className="text-faint" />} />
            <div className="space-y-3 px-5 pb-4 pt-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-[11.5px]">
                  <span className="text-faint">Uptime</span>
                  <span className="text-ink">{bot.stats.uptimePct ? pct(bot.stats.uptimePct) : "not measured"}</span>
                </div>
                <Progress value={bot.stats.uptimePct} color={bot.stats.uptimePct >= 99 ? "rgb(var(--brand))" : "#f5b544"} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[11.5px]">
                  <span className="text-faint">CPU</span>
                  <span className="text-ink">{bot.stats.cpu}%</span>
                </div>
                <Progress value={bot.stats.cpu} color="#8b7cff" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[11.5px]">
                  <span className="flex items-center gap-1 text-faint">
                    <MemoryStick size={10} /> Memory
                  </span>
                  <span className="text-ink">{bot.stats.memMB} MB</span>
                </div>
                <Progress value={Math.min(100, (bot.stats.memMB / 512) * 100)} color="#4cc9f0" />
              </div>
              <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-faint">
                <Repeat2 size={10} className="mt-0.5 shrink-0" />
                Restarted {bot.restartCount} time{bot.restartCount === 1 ? "" : "s"}
                {bot.startedAt ? `, running ${since(bot.startedAt, now)}` : ", never started"}.
              </p>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHead title="Raw record" subtitle="The JSON the product returned for this bot" />
            <pre className="max-h-[260px] overflow-auto border-t border-line/60 bg-canvas/50 px-4 py-3 font-mono text-[10.5px] leading-relaxed text-muted">
              {JSON.stringify(bot, null, 2)}
            </pre>
          </Card>
        </div>
      </div>

      <p className={cn("mt-4 text-[10.5px] text-faint")}>
        Snapshot {stampUTC(now)} · source {baseUrl}/api/admin/data · nothing on this page is cached between requests.
      </p>
    </>
  );
}

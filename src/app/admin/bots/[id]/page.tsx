import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CircleAlert,
  Clock,
  Globe2,
  Pause,
  Play,
  RefreshCw,
  Terminal,
  Users2,
} from "lucide-react";
import { BotTabs } from "@/components/bot-tabs";
import { ActionButton, CopyButton } from "@/components/actions";
import { Avatar, Badge, Card, Mono, StatusBadge } from "@/components/ui";
import { bots, botOwner, getBot, logs } from "@/lib/data";
import { fmt, relTime } from "@/lib/format";

export default function BotDetailPage({ params }: { params: { id: string } }) {
  const bot = getBot(params.id) ?? bots.find((b) => b.slug === params.id);
  if (!bot) notFound();
  const owner = botOwner(bot);
  const botLogs = logs.filter((l) => l.bot === bot.slug).slice(-60);

  return (
    <>
      <Link href="/admin/bots" className="mb-3 inline-flex items-center gap-1.5 text-[11.5px] text-faint transition-colors hover:text-ink">
        <ArrowLeft size={12} /> Back to fleet
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-gradient-to-br from-raised to-canvas font-mono text-[16px] text-muted">
            {bot.name.slice(0, 2)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">{bot.name}</h1>
              <StatusBadge status={bot.status} pulse />
              {bot.flags.map((f) => (
                <span key={f} className="chip h-[19px] px-1.5 py-0 font-mono text-[9.5px]">
                  {f}
                </span>
              ))}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-faint">
              <span className="font-mono text-[11px] text-muted">{bot.handle}</span>
              <span className="flex items-center gap-1">
                <Users2 size={10} />
                <Link href={`/admin/users/${owner.id}`} className="hover:text-ink">
                  {owner.name}
                </Link>
              </span>
              <span className="flex items-center gap-1">
                <Globe2 size={10} /> {bot.region}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={10} /> deployed {relTime(bot.lastDeploy)}
              </span>
              <Mono>{bot.id}</Mono>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CopyButton value={bot.webhook.url} label="Webhook URL" />
          <Link href={`/admin/logs?bot=${bot.slug}`} className="btn">
            <Terminal size={12} /> Logs
          </Link>
          <ActionButton
            label="Redeploy"
            icon={<RefreshCw size={12} />}
            kind="success"
            title="Redeploy queued"
            body="analyser → compile → setWebhook · ~1.8s"
          />
          {bot.status === "paused" ? (
            <ActionButton
              label="Resume bot"
              icon={<Play size={12} />}
              kind="success"
              title="Bot resumed"
              body="setWebhook re-registered · updates flowing"
              variant="primary"
            />
          ) : (
            <ActionButton
              label="Pause"
              icon={<Pause size={12} />}
              kind="warn"
              title="Bot paused"
              body="Telegram updates answered 503 and retried"
            />
          )}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        {[
          { k: "updates 24h", v: fmt(bot.updates24h) },
          { k: "success rate", v: `${bot.successRate.toFixed(2)}%` },
          { k: "p95", v: `${bot.p95} ms` },
          { k: "handlers", v: String(bot.handlers.length) },
          { k: "deliveries", v: fmt(bot.webhook.deliveries) },
          { k: "failures", v: String(bot.webhook.failures) },
        ].map((s) => (
          <div key={s.k} className="panel px-3 py-2">
            <div className="text-[9.5px] uppercase tracking-[0.08em] text-faint">{s.k}</div>
            <div className="font-mono text-[13.5px] text-ink">{s.v}</div>
          </div>
        ))}
      </div>

      {bot.status === "error" ? (
        <Card className="mb-3 border-[#ff5d6c]/25 bg-[#ff5d6c]/[0.04] p-3">
          <div className="flex items-start gap-2.5">
            <CircleAlert size={15} className="mt-0.5 shrink-0 text-[#ff7c88]" />
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-[#ff929c]">
                Compile error · <span className="font-mono text-[11.5px]">ModuleNotFoundError: No module named &apos;telegram.ext&apos;</span>
              </p>
              <pre className="mt-1.5 overflow-x-auto rounded-md border border-[#ff5d6c]/20 bg-[#080b12] p-2 font-mono text-[10.5px] leading-relaxed text-[#c3cfdf]">
{`Traceback (most recent call last):
  File "main.py", line 4, in <module>
    from telegram.ext import Application, CommandHandler
ModuleNotFoundError: No module named 'telegram.ext'

hint: python-telegram-bot 13.x exposes telegram.ext.Updater —
      pin >=21.6 to use Application, or switch the code to Updater.`}
              </pre>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ActionButton
                  label="Auto-fix pin → python-telegram-bot>=21.6"
                  kind="success"
                  title="Pin updated"
                  body="requirements.txt rewritten · recompile queued"
                  variant="primary"
                  className="h-7 text-[11px]"
                />
                <ActionButton
                  label="Open analyser report"
                  kind="info"
                  title="Analyser report"
                  body="3 imports resolved · 1 conflict auto-pinned"
                  className="h-7 text-[11px]"
                />
                <Badge tone="danger">blocks webhook replies</Badge>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <BotTabs bot={bot} owner={owner} logs={botLogs} />
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Cloud,
  Info,
  Megaphone,
  RotateCcw,
  Save,
  ShieldCheck,
  UserPlus,
  Wrench,
} from "lucide-react";
import type { PlatformSettings } from "@/lib/types";
import { cn, stampUTC } from "@/lib/format";
import { Badge, Card, CardHead, Divider } from "./ui";
import { useToast } from "./toast";

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      disabled={disabled}
      className={cn(
        "relative h-[20px] w-[36px] shrink-0 rounded-full border transition-colors disabled:opacity-50",
        on ? "border-brand/40 bg-brand/80" : "border-line bg-line/80",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform",
          on ? "translate-x-[18px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

function Field({
  icon,
  title,
  description,
  children,
  control,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
  control?: React.ReactNode;
}) {
  return (
    <div className="border-b border-line/60 py-3.5 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-2.5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-raised text-faint">{icon}</span>
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-ink">{title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-faint">{description}</p>
          </div>
        </div>
        {control}
      </div>
      {children ? <div className="mt-2.5 pl-[34px]">{children}</div> : null}
    </div>
  );
}

export function PlatformSettingsForm({
  initial,
  updatedAt,
  baseUrl,
  storage,
  operator,
  readAt,
}: {
  initial: PlatformSettings;
  updatedAt: number | null;
  baseUrl: string;
  storage: string;
  operator: string;
  readAt: number;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [baseline, setBaseline] = useState<PlatformSettings>(initial);
  const [form, setForm] = useState<PlatformSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirtyKeys = useMemo(
    () =>
      (["maintenance", "maintenanceMessage", "broadcast", "signupsOpen"] as const).filter(
        (k) => form[k] !== baseline[k],
      ),
    [form, baseline],
  );
  const dirty = dirtyKeys.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          maintenance: form.maintenance,
          maintenanceMessage: form.maintenanceMessage,
          broadcast: form.broadcast,
          signupsOpen: form.signupsOpen,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        settings?: PlatformSettings;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !payload.settings) {
        push({
          kind: "error",
          title: res.status === 401 ? "Operator session expired" : "The product rejected the change",
          body: payload.detail ?? payload.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      const next = { ...form, ...payload.settings };
      setForm(next);
      setBaseline(next);
      setSavedAt(Date.now());
      push({ kind: "success", title: "Saved on the product", body: "The values below are the product's response." });
      router.refresh();
    } catch (error) {
      push({ kind: "error", title: "Could not reach the console API", body: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
      <Card className="overflow-hidden">
        <CardHead
          title="Platform controls"
          subtitle={`${dirtyKeys.length ? `${dirtyKeys.length} unsaved change${dirtyKeys.length === 1 ? "" : "s"}` : "in sync with the product"} · written straight to ${baseUrl.replace(/^https?:\/\//, "")}`}
          action={<Badge tone={dirty ? "warn" : "success"}>{dirty ? "unsaved" : "synced"}</Badge>}
        />
        <div className="px-5 pb-4 pt-1">
          <Field
            icon={<Wrench size={12} />}
            title="Maintenance mode"
            description="When on, the product stops serving sign-ins and shows the message below to every visitor."
            control={<Toggle on={form.maintenance} onChange={(v) => setForm({ ...form, maintenance: v })} disabled={saving} />}
          >
            {form.maintenance ? (
              <textarea
                value={form.maintenanceMessage}
                onChange={(e) => setForm({ ...form, maintenanceMessage: e.target.value })}
                rows={2}
                maxLength={240}
                placeholder="We'll be back shortly — deployments are paused."
                className="input resize-none text-[12px]"
              />
            ) : null}
          </Field>

          <Field
            icon={<Megaphone size={12} />}
            title="Broadcast banner"
            description="Shown at the top of the product console for every signed-in user. Leave empty for no banner."
            control={
              <span className="text-[10.5px] text-faint">
                {form.broadcast.length}/240
              </span>
            }
          >
            <textarea
              value={form.broadcast}
              onChange={(e) => setForm({ ...form, broadcast: e.target.value })}
              rows={3}
              maxLength={240}
              placeholder="Nothing is being announced right now."
              className="input resize-none text-[12px]"
            />
          </Field>

          <Field
            icon={<UserPlus size={12} />}
            title="Open sign-ups"
            description="Controls whether new accounts can be created on the product."
            control={<Toggle on={form.signupsOpen} onChange={(v) => setForm({ ...form, signupsOpen: v })} disabled={saving} />}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={save} disabled={!dirty || saving} className="btn-primary h-8 text-[12px]">
              <Save size={13} /> {saving ? "Saving…" : "Save to product"}
            </button>
            <button onClick={() => setForm(baseline)} disabled={!dirty || saving} className="btn h-8 text-[12px]">
              <RotateCcw size={12} /> Revert
            </button>
            {savedAt ? (
              <span className="flex items-center gap-1 text-[11px] text-[#5eeac0]">
                <Check size={11} /> saved {stampUTC(savedAt)}
              </span>
            ) : null}
            <span className="ml-auto text-[10.5px] text-faint">
              state read {stampUTC(readAt)}
              {updatedAt ? ` · product updated ${stampUTC(updatedAt)}` : ""}
            </span>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <Card className="overflow-hidden">
          <CardHead title="What this writes" subtitle="Exactly the four fields the operator API accepts" action={<ShieldCheck size={14} className="text-faint" />} />
          <div className="px-5 pb-4 pt-2">
            {(
              [
                ["maintenance", form.maintenance, baseline.maintenance],
                ["maintenanceMessage", form.maintenanceMessage, baseline.maintenanceMessage],
                ["broadcast", form.broadcast, baseline.broadcast],
                ["signupsOpen", form.signupsOpen, baseline.signupsOpen],
              ] as const
            ).map(([key, now, was]) => (
              <div key={key} className="flex items-start justify-between gap-3 border-b border-line/60 py-2 last:border-0">
                <span className="font-mono text-[11px] text-faint">{key}</span>
                <span className="max-w-[62%] break-words text-right font-mono text-[11px]">
                  {now === was ? (
                    <span className="text-muted">{JSON.stringify(now)}</span>
                  ) : (
                    <>
                      <span className="text-faint line-through">{JSON.stringify(was)}</span>{" "}
                      <span className="text-[#f7c66b]">{JSON.stringify(now)}</span>
                    </>
                  )}
                </span>
              </div>
            ))}
            <Divider className="my-3" />
            <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-faint">
              <Info size={11} className="mt-0.5 shrink-0" />
              POST /api/admin/settings is proxied through this console with your operator session — the console never
              stores these values itself.
            </p>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHead title="Operator session" subtitle="Who these changes are attributed to" action={<Cloud size={14} className="text-faint" />} />
          <div className="px-5 pb-4 pt-2 text-[11.5px]">
            {[
              ["Operator", operator],
              ["Product", baseUrl.replace(/^https?:\/\//, "")],
              ["Storage", storage],
              ["Auth", "product operator cookie (bf_operator)"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 border-b border-line/60 py-2 last:border-0">
                <span className="text-faint">{k}</span>
                <span className="truncate font-mono text-[11px] text-ink">{v}</span>
              </div>
            ))}
            <a
              href={`${baseUrl}/console`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-line bg-raised/50 py-2 text-[11.5px] text-muted transition-colors hover:text-ink"
            >
              Verify on the product <ArrowUpRight size={11} />
            </a>
          </div>
        </Card>

        {form.maintenance ? (
          <div className="flex items-start gap-2 rounded-xl border border-[#f5b544]/30 bg-[#f5b544]/[0.07] p-3 text-[11.5px] text-[#f7c66b]">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            Saving with maintenance on will take the product offline for its users immediately.
          </div>
        ) : null}
      </div>
    </div>
  );
}

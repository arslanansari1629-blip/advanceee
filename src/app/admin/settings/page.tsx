import { RefreshCw } from "lucide-react";
import { ConnectionState } from "@/components/connection-state";
import { PlatformSettingsForm } from "@/components/platform-settings";
import { RefreshButton } from "@/components/refresh-button";
import { PageHeader } from "@/components/ui";
import { loadAdminState, getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const now = Date.now();
  const [state, session] = await Promise.all([loadAdminState(), getSession()]);

  if (state.state !== "ok") {
    return (
      <>
        <PageHeader eyebrow="platform" title="Platform" subtitle="Maintenance, broadcast and sign-up controls, written to the product." />
        <ConnectionState state={state} />
      </>
    );
  }

  const { data, baseUrl } = state;

  return (
    <>
      <PageHeader
        eyebrow="platform"
        title="Platform"
        subtitle="These four flags are the only global switches the product exposes to an operator. Saving calls POST /api/admin/settings and then re-reads the product — the panel shows whatever came back, not what was typed."
        actions={<RefreshButton label="Re-read from product" />}
      />

      <PlatformSettingsForm
        initial={data.settings}
        updatedAt={data.settings.updatedAt ?? null}
        baseUrl={baseUrl}
        storage={data.storage}
        operator={session ? `${session.name} (${session.user})` : "unknown"}
        readAt={now}
      />

      <p className="mt-4 flex items-center gap-1.5 text-[10.5px] text-faint">
        <RefreshCw size={10} /> Nothing here is optimistic: if the product does not confirm the change, the form keeps
        the old value and shows the error.
      </p>
    </>
  );
}

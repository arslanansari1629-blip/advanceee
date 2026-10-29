/**
 * Derives the chrome (sidebar / header / alerts) from live product data.
 * Nothing here is invented: when the product has no errored bots, no suspended
 * accounts and maintenance is off, the alert list is genuinely empty.
 */
import type { AdminState } from "@/lib/types";
import type { ShellAlert, ShellData } from "@/components/app-shell";

export function shellFrom(state: AdminState): ShellData {
  const host = state.baseUrl.replace(/^https?:\/\//, "");

  if (state.state !== "ok") {
    return {
      host,
      storage: "—",
      bots: 0,
      live: 0,
      errors: 0,
      users: 0,
      updates: 0,
      maintenance: false,
      signupsOpen: false,
      connected: false,
      status: state.state,
      alerts: [
        {
          title:
            state.state === "unreachable"
              ? "Product unreachable"
              : state.state === "unlinked"
                ? "Operator session not linked"
                : "Product rejected the operator session",
          detail:
            state.state === "unreachable"
              ? state.error
              : state.state === "unlinked"
                ? "Sign in again to read live data"
                : "The product session expired — sign in again",
          href: "/admin/system",
          tone: "#ff5d6c",
        },
      ],
    };
  }

  const { data } = state;
  const alerts: ShellAlert[] = [];

  for (const bot of data.bots.filter((b) => b.status === "error")) {
    alerts.push({
      title: `${bot.name} is in error`,
      detail: bot.lastError ? bot.lastError.slice(0, 72) : "No error message was reported",
      href: `/admin/bots/${bot.id}`,
      tone: "#ff5d6c",
    });
  }

  if (data.stats.suspended > 0) {
    alerts.push({
      title: `${data.stats.suspended} suspended account${data.stats.suspended === 1 ? "" : "s"}`,
      detail: "Plan set to suspended on the product",
      href: "/admin/users?plan=suspended",
      tone: "#f5b544",
    });
  }

  if (data.settings.maintenance) {
    alerts.push({
      title: "Maintenance mode is on",
      detail: data.settings.maintenanceMessage || "Users cannot sign in while this is on",
      href: "/admin/settings",
      tone: "#8b7cff",
    });
  }

  if (!data.engine.online) {
    alerts.push({
      title: "Webhook engine reports offline",
      detail: `Runner mode: ${data.engine.mode}`,
      href: "/admin/system",
      tone: "#f5b544",
    });
  }

  return {
    host,
    storage: data.storage,
    bots: data.stats.bots,
    live: data.stats.live,
    errors: data.stats.errors,
    users: data.stats.users,
    updates: data.stats.updates,
    maintenance: data.settings.maintenance,
    signupsOpen: data.settings.signupsOpen,
    connected: true,
    status: "ok",
    alerts: alerts.slice(0, 6),
  };
}

import { NextResponse } from "next/server";
import { getSession, loadAdminState } from "@/lib/session";
import { savePlatformSettings } from "@/lib/product";
import type { PlatformSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await loadAdminState();
  if (state.state !== "ok") {
    return NextResponse.json(
      { error: state.state, detail: state.state === "unreachable" ? state.error : `${state.state} operator session` },
      { status: 502 },
    );
  }
  return NextResponse.json({ settings: state.data.settings, storage: state.data.storage });
}

const FIELDS: (keyof PlatformSettings)[] = ["maintenance", "maintenanceMessage", "broadcast", "signupsOpen"];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.op) {
    return NextResponse.json({ error: "unlinked", detail: "Sign in again so the console can reach the product." }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const patch: Partial<PlatformSettings> = {};
  for (const field of FIELDS) {
    const value = body[field];
    if (field === "maintenance" || field === "signupsOpen") {
      if (typeof value === "boolean") patch[field] = value;
    } else if (typeof value === "string" && (field === "maintenanceMessage" || field === "broadcast")) {
      patch[field] = value.slice(0, 240);
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 422 });
  }

  const result = await savePlatformSettings(session.op, patch);
  if (!result.ok) {
    const status = result.reason === "unauthorized" ? 401 : 502;
    return NextResponse.json(
      {
        error: result.reason,
        detail:
          result.reason === "unauthorized"
            ? "The product operator session expired — sign in again."
            : result.detail ?? "The product did not answer.",
      },
      { status },
    );
  }

  return NextResponse.json({ settings: result.data.settings, latencyMs: result.latencyMs });
}

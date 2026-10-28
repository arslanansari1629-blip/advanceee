import { adminOnly, json, readJson } from "@/lib/api";
import { getPlatformSettings, setPlatformSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await adminOnly();
  if (!gate.ok) return gate.error;
  return json({ settings: await getPlatformSettings() });
}

export async function POST(req: Request) {
  const gate = await adminOnly();
  if (!gate.ok) return gate.error;

  const body = await readJson<{
    maintenance?: boolean;
    maintenanceMessage?: string;
    broadcast?: string;
    signupsOpen?: boolean;
  }>(req);
  if (!body) return json({ error: "Invalid body" }, 400);

  const next = await setPlatformSettings({
    ...(typeof body.maintenance === "boolean" ? { maintenance: body.maintenance } : {}),
    ...(typeof body.maintenanceMessage === "string"
      ? { maintenanceMessage: body.maintenanceMessage.slice(0, 240) }
      : {}),
    ...(typeof body.broadcast === "string" ? { broadcast: body.broadcast.slice(0, 240) } : {}),
    ...(typeof body.signupsOpen === "boolean" ? { signupsOpen: body.signupsOpen } : {}),
  });

  return json({ settings: next });
}

import { json } from "@/lib/api";
import { storageMode } from "@/lib/db";
import { siteUrl } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return json({
    ok: true,
    service: "botforge-cloud",
    version: "2.0.0",
    mode: "webhook-engine",
    runner: "none",
    storage: storageMode(),
    siteUrl: siteUrl(),
    endpoint: `${siteUrl()}/api/tg/<botId>`,
    time: new Date().toISOString(),
  });
}

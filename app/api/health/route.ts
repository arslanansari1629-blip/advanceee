import { json } from "@/lib/api";
import { storageMode } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return json({
    ok: true,
    service: "botforge-cloud",
    version: "1.0.0",
    storage: storageMode(),
    runner: process.env.RUNNER_URL ? "configured" : "preview-only",
    time: new Date().toISOString(),
  });
}

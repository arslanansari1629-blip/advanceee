import { NextResponse } from "next/server";
import { bots, kpis, logs, planMix, revenueSeries, statusMix, users } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const range = new URL(request.url).searchParams.get("range") ?? "24h";
  return NextResponse.json(
    {
      range,
      generated_at: new Date().toISOString(),
      kpis,
      fleet: {
        total: bots.length,
        status: Object.fromEntries(statusMix.map((s) => [s.status, s.count])),
        library: bots.reduce<Record<string, number>>((acc, b) => {
          acc[b.library] = (acc[b.library] ?? 0) + 1;
          return acc;
        }, {}),
      },
      revenue: { plans: planMix, series: revenueSeries.map((r) => r.mrr) },
      users: { total: users.length, paying: kpis.paidUsers },
      logs: { buffered: logs.length, errors: logs.filter((l) => l.level === "error").length },
      note: "Demo admin API · deterministic seeded dataset · do not expose publicly",
    },
    { headers: { "cache-control": "no-store", "x-botforge-env": "demo" } },
  );
}

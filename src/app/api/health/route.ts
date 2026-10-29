import { NextResponse } from "next/server";
import { PRODUCT_BASE, fetchProductHealth, isProductConfigured, probeOperatorLogin } from "@/lib/product";

export const dynamic = "force-dynamic";

/**
 * Public, non-sensitive probe: is this console able to reach the product?
 * No counts, no accounts, no tokens — just connectivity facts.
 */
export async function GET() {
  if (!isProductConfigured()) {
    return NextResponse.json({ console: "botforge-admin", product: { configured: false } }, { status: 200 });
  }

  const started = Date.now();
  const [result, operatorLogin] = await Promise.all([fetchProductHealth(), probeOperatorLogin()]);
  const latencyMs = Date.now() - started;

  return NextResponse.json(
    {
      console: "botforge-admin",
      product: {
        configured: true,
        base: PRODUCT_BASE,
        reachable: result.ok,
        latency_ms: result.ok ? result.latencyMs : latencyMs,
        ...(result.ok
          ? { service: result.data.service, version: result.data.version, mode: result.data.mode, storage: result.data.storage }
          : { error: result.reason }),
        // Does this deployment's configured operator credential work on the
        // product? Booleans only — no credentials, tokens or counts leak here.
        operator_login: operatorLogin,
      },
      time: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

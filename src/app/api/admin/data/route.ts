import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchAdminData, PRODUCT_BASE } from "@/lib/product";

export const dynamic = "force-dynamic";

/** Authenticated proxy so client components (refresh buttons) read live data. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!session.op) {
    return NextResponse.json(
      { error: "unlinked", detail: "This session was established without a product operator token.", product: PRODUCT_BASE },
      { status: 409 },
    );
  }

  const result = await fetchAdminData(session.op);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, detail: result.reason === "unauthorized" ? "Operator session expired." : result.detail },
      { status: result.reason === "unauthorized" ? 401 : 502 },
    );
  }
  return NextResponse.json(result.data, { headers: { "cache-control": "no-store" } });
}

/**
 * Server-side loader for live product data.
 *
 * `cache()` dedupes the product round-trip inside one render pass, so the
 * layout and the page can both ask for data without two network calls.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSession, type Session } from "@/lib/auth";
import { PRODUCT_BASE, fetchAdminData, getServiceToken, isProductConfigured } from "@/lib/product";
import type { AdminState } from "@/lib/types";

export const getSession = cache(async (): Promise<Session | null> => {
  return readSession(cookies().get(SESSION_COOKIE)?.value);
});

export const loadAdminState = cache(async (): Promise<AdminState> => {
  const baseUrl = PRODUCT_BASE;

  if (!isProductConfigured()) {
    return { state: "unreachable", baseUrl, error: "BOTFORGE_API_URL is not set on this deployment." };
  }

  const session = await getSession();
  // Prefer the token minted by the human's login; otherwise use this
  // deployment's own operator credential (same read-only access, no fixtures).
  const token = session?.op ?? (await getServiceToken());

  if (!token) {
    return { state: "unlinked", baseUrl };
  }

  const result = await fetchAdminData(token);
  if (result.ok) {
    return { state: "ok", data: result.data, latencyMs: result.latencyMs, baseUrl };
  }
  if (result.reason === "unauthorized") {
    return { state: "unauthorized", baseUrl };
  }
  return { state: "unreachable", baseUrl, error: result.detail ?? "The product did not answer." };
});

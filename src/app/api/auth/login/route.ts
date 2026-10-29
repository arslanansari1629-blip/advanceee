/**
 * Login: the product's operator API is the source of truth.
 *
 *  1. Credentials are sent to `POST {product}/api/admin/login`.
 *  2. On success we keep the product operator token inside our own signed
 *     session cookie and use it for every live read.
 *  3. If the product is unreachable we fall back to the locally configured
 *     ADMIN_USERNAME / ADMIN_PASSWORD so the console still opens — it will show
 *     an honest "product unreachable" state instead of stale numbers.
 */
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  isAuthConfigured,
  publicUrl,
  verifyCredentials,
} from "@/lib/auth";
import { getServiceToken, isProductConfigured, operatorLogin } from "@/lib/product";

export const dynamic = "force-dynamic";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function blocked(ip: string) {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailure(ip: string) {
  const entry = attempts.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

function clientIp(request: Request) {
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

function safeNext(value: string | null): string {
  return value && value.startsWith("/admin") ? value : "/admin";
}

export async function POST(request: Request) {
  if (!isAuthConfigured() && !isProductConfigured()) {
    return NextResponse.json(
      { error: "auth_not_configured", detail: "Set ADMIN_USERNAME and ADMIN_PASSWORD in the environment." },
      { status: 503 },
    );
  }

  const ip = clientIp(request);
  if (blocked(ip)) {
    return NextResponse.json(
      { error: "too_many_attempts", detail: "Too many attempts. Try again in 5 minutes." },
      { status: 429, headers: { "retry-after": "300" } },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  const wantsJson = contentType.includes("application/json");
  let username = "";
  let password = "";
  let remember = false;

  if (wantsJson) {
    try {
      const body = (await request.json()) as { username?: string; password?: string; remember?: boolean };
      username = body.username ?? "";
      password = body.password ?? "";
      remember = Boolean(body.remember);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
  } else {
    const form = await request.formData();
    username = String(form.get("username") ?? "");
    password = String(form.get("password") ?? "");
    remember = form.get("remember") === "on" || form.get("remember") === "true";
  }

  const requestUrl = new URL(request.url);
  const next = safeNext(requestUrl.searchParams.get("next"));

  let operatorToken: string | undefined;
  let via: "product" | "local" = "local";
  let productProblem: string | null = null;

  if (isProductConfigured()) {
    const attempt = await operatorLogin(username.trim(), password);
    if (attempt.ok) {
      operatorToken = attempt.token;
      via = "product";
    } else if (attempt.reason === "invalid") {
      // The product rejected what was typed. That is only fatal if it is also
      // wrong for this console: the operator credential configured on this
      // deployment (BOTFORGE_OPERATOR_USERNAME / _PASSWORD) can still mint a
      // product session, so live data keeps flowing.
      productProblem = "the product rejected the typed credentials";
      if (!verifyCredentials(username, password)) {
        registerFailure(ip);
        if (wantsJson) {
          return NextResponse.json({ error: "invalid_credentials", detail: "Wrong username or password." }, { status: 401 });
        }
        const url = publicUrl(request, "/login");
        url.searchParams.set("e", "1");
        if (next !== "/admin") url.searchParams.set("next", next);
        return NextResponse.redirect(url, { status: 303 });
      }
      const serviceToken = await getServiceToken();
      if (serviceToken) {
        operatorToken = serviceToken;
        via = "product";
        productProblem = null;
      }
    } else {
      // Product down or misconfigured: fall back to local credentials only.
      productProblem = attempt.detail ?? attempt.reason;
      if (!verifyCredentials(username, password)) {
        registerFailure(ip);
        if (wantsJson) {
          return NextResponse.json(
            { error: "invalid_credentials", detail: "Wrong username or password." },
            { status: 401 },
          );
        }
        const url = publicUrl(request, "/login");
        url.searchParams.set("e", "1");
        return NextResponse.redirect(url, { status: 303 });
      }
    }
  } else if (!verifyCredentials(username, password)) {
    registerFailure(ip);
    if (wantsJson) {
      return NextResponse.json({ error: "invalid_credentials", detail: "Wrong username or password." }, { status: 401 });
    }
    const url = publicUrl(request, "/login");
    url.searchParams.set("e", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  attempts.delete(ip);
  const { token, maxAge } = await createSession(username.trim(), remember, { operatorToken, via });

  const response = wantsJson
    ? NextResponse.json(
        { ok: true, user: username.trim(), via, product: via === "product" ? "linked" : (productProblem ?? "unlinked"), redirect: next },
        { status: 200 },
      )
    : NextResponse.redirect(publicUrl(request, next), { status: 303 });

  response.cookies.set(SESSION_COOKIE, token, cookieOptions(maxAge));
  return response;
}

import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  isAuthConfigured,
  publicUrl,
  verifyCredentials,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Very small in-memory throttle: 8 attempts / 5 minutes per IP. */
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

function safeNext(value: FormDataEntryValue | string | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/admin") ? next : "/admin";
}

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
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
  let username = "";
  let password = "";
  let remember = false;
  let wantsJson = contentType.includes("application/json");

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
    wantsJson = false;
  }

  const requestUrl = new URL(request.url);
  const next = safeNext(requestUrl.searchParams.get("next"));

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

  attempts.delete(ip);
  const { token, maxAge } = await createSession(username.trim(), remember);

  const response = wantsJson
    ? NextResponse.json({ ok: true, user: username.trim(), redirect: next }, { status: 200 })
    : NextResponse.redirect(publicUrl(request, next), { status: 303 });

  response.cookies.set(SESSION_COOKIE, token, cookieOptions(maxAge));
  return response;
}

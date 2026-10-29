import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession, isAuthConfigured } from "@/lib/auth";

/**
 * Gate every admin surface behind a signed session cookie.
 *
 * - `/admin/*`      -> redirect to /login?next=…
 * - `/api/admin/*`  -> 401 JSON
 *
 * `/login` and `/api/health` stay public on purpose.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        error: "auth_not_configured",
        detail: "Set ADMIN_USERNAME and ADMIN_PASSWORD in the project environment variables.",
      },
      { status: 503 },
    );
  }

  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized", detail: "Sign in at /login" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const next = `${pathname}${search}`;
  if (next && next !== "/admin") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

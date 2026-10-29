import { NextResponse } from "next/server";
import { SESSION_COOKIE, publicUrl } from "@/lib/auth";

export const dynamic = "force-dynamic";

function clear(request: Request) {
  const response = NextResponse.redirect(publicUrl(request, "/login?out=1"), { status: 303 });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 0 });
  return response;
}

export async function POST(request: Request) {
  return clear(request);
}

export async function GET(request: Request) {
  return clear(request);
}

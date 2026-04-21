import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/config";

export async function middleware(req: NextRequest) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  if (access) {
    const payload = await verifyAccessToken(access);
    if (payload) return NextResponse.next();
  }

  // Access token missing or expired — let the login page handle refresh if a refresh cookie exists.
  const url = new URL("/login", req.url);
  if (req.nextUrl.pathname !== "/") {
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  }
  if (refresh) url.searchParams.set("try_refresh", "1");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Protect all UI pages. Exclude: API routes (self-enforced via requireUser),
    // static assets, auth pages, and Next internals.
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|login).*)",
  ],
};

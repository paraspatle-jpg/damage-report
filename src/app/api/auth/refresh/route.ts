import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signAccessToken } from "@/lib/auth/jwt";
import { rotateRefreshToken } from "@/lib/auth/tokens";
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  COOKIE_OPTS,
  REFRESH_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@/lib/auth/config";

export async function POST() {
  const store = await cookies();
  const raw = store.get(REFRESH_COOKIE)?.value;
  if (!raw) return NextResponse.json({ error: "no refresh token" }, { status: 401 });

  const result = await rotateRefreshToken(raw);
  if (!result.ok) {
    const res = NextResponse.json({ error: result.reason }, { status: 401 });
    res.cookies.delete(ACCESS_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  }

  const access = await signAccessToken(result.userId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, access, { ...COOKIE_OPTS, maxAge: ACCESS_TOKEN_TTL_SECONDS });
  res.cookies.set(REFRESH_COOKIE, result.newRaw, { ...COOKIE_OPTS, maxAge: REFRESH_TOKEN_TTL_SECONDS });
  return res;
}

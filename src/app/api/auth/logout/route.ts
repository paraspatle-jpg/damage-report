import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeRefreshToken } from "@/lib/auth/tokens";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/config";

export async function POST() {
  const store = await cookies();
  const raw = store.get(REFRESH_COOKIE)?.value;
  if (raw) await revokeRefreshToken(raw);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}

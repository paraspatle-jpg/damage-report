import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signAccessToken } from "@/lib/auth/jwt";
import { issueRefreshToken } from "@/lib/auth/tokens";
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  COOKIE_OPTS,
  REFRESH_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@/lib/auth/config";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  const ok = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !ok) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const access = await signAccessToken(user.id);
  const refresh = await issueRefreshToken(user.id);

  const res = NextResponse.json({ ok: true, email: user.email });
  res.cookies.set(ACCESS_COOKIE, access, { ...COOKIE_OPTS, maxAge: ACCESS_TOKEN_TTL_SECONDS });
  res.cookies.set(REFRESH_COOKIE, refresh, { ...COOKIE_OPTS, maxAge: REFRESH_TOKEN_TTL_SECONDS });
  return res;
}

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ACCESS_COOKIE } from "./config";
import { verifyAccessToken } from "./jwt";
import { verifyApiKey } from "./api-key";

export type AuthedUser = { id: string; email: string; via: "jwt" | "api_key" };

function extractBearer(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const x = req.headers.get("x-api-key");
  if (x) return x.trim();
  return null;
}

export async function getAuthedUser(req: Request): Promise<AuthedUser | null> {
  const bearer = extractBearer(req);
  if (bearer) {
    const v = await verifyApiKey(bearer);
    if (v) {
      const u = await prisma.user.findUnique({ where: { id: v.userId } });
      if (u) return { id: u.id, email: u.email, via: "api_key" };
    }
  }
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (access) {
    const payload = await verifyAccessToken(access);
    if (payload) {
      const u = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (u) return { id: u.id, email: u.email, via: "jwt" };
    }
  }
  return null;
}

export async function requireUser(req: Request): Promise<AuthedUser> {
  const user = await getAuthedUser(req);
  if (!user) {
    const err = new Error("UNAUTHENTICATED");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  return user;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: "unauthenticated" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

type RouteHandler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response> | Response;

export function withAuth<Ctx = unknown>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req, ctx) => {
    const user = await getAuthedUser(req);
    if (!user) return unauthorized();
    return handler(req, ctx);
  };
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth/guards";
import { getAuthedUser } from "@/lib/auth/guards";
import { createApiKey } from "@/lib/auth/api-key";

export const GET = withAuth(async (req) => {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ keys: [] });
  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ keys });
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(64),
});

export const POST = withAuth(async (req) => {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.via !== "jwt") {
    return NextResponse.json({ error: "API keys cannot create other API keys" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { raw, key } = await createApiKey(user.id, parsed.data.name);
  return NextResponse.json(
    {
      key: {
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        createdAt: key.createdAt,
      },
      raw,
    },
    { status: 201 },
  );
});

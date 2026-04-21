import { NextResponse } from "next/server";
import { z } from "zod";
import { AssetCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth/guards";

const holdingSchema = z.object({
  symbol: z.string().min(1).transform((s) => s.trim().toUpperCase()),
  name: z.string().optional(),
  category: z.nativeEnum(AssetCategory),
  quantity: z.number().positive(),
  buyPrice: z.number().positive(),
  notes: z.string().optional(),
});

export const GET = withAuth(async () => {
  const holdings = await prisma.holding.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ holdings });
});

export const POST = withAuth(async (req) => {
  const body = await req.json();
  const parsed = holdingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const holding = await prisma.holding.create({ data: parsed.data });
  return NextResponse.json({ holding }, { status: 201 });
});

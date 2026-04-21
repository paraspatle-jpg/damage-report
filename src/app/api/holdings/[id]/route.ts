import { NextResponse } from "next/server";
import { z } from "zod";
import { AssetCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth/guards";

const updateSchema = z.object({
  symbol: z.string().min(1).transform((s) => s.trim().toUpperCase()).optional(),
  name: z.string().optional(),
  category: z.nativeEnum(AssetCategory).optional(),
  quantity: z.number().positive().optional(),
  buyPrice: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const holding = await prisma.holding.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ holding });
});

export const DELETE = withAuth<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  await prisma.holding.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

import { NextResponse } from "next/server";
import { z } from "zod";
import { AssetCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth/guards";

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  baseAmount: z.number().positive().optional(),
  category: z.nativeEnum(AssetCategory).optional(),
  active: z.boolean().optional(),
});

export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const plan = await prisma.sipPlan.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ plan });
});

export const DELETE = withAuth<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  await prisma.sipPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

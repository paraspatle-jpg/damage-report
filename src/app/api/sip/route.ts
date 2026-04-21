import { NextResponse } from "next/server";
import { z } from "zod";
import { AssetCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { listSipsWithRecommendations } from "@/lib/sip/service";
import { withAuth } from "@/lib/auth/guards";

export const GET = withAuth(async () => {
  const plans = await listSipsWithRecommendations();
  return NextResponse.json({ plans });
});

const createSchema = z.object({
  symbol: z.string().min(1).transform((s) => s.trim().toUpperCase()),
  label: z.string().min(1),
  baseAmount: z.number().positive(),
  category: z.nativeEnum(AssetCategory).default(AssetCategory.INDEX_ETF),
});

export const POST = withAuth(async (req) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const plan = await prisma.sipPlan.create({ data: parsed.data });
  return NextResponse.json({ plan }, { status: 201 });
});

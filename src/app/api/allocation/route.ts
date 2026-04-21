import { NextResponse } from "next/server";
import { z } from "zod";
import { AssetCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { analyzeAllocation } from "@/lib/allocation/analyzer";
import { getPortfolioSnapshot } from "@/lib/portfolio/service";
import { withAuth } from "@/lib/auth/guards";

export const GET = withAuth(async () => {
  const [snapshot, targets] = await Promise.all([
    getPortfolioSnapshot(),
    prisma.allocationTarget.findMany(),
  ]);
  const rows = analyzeAllocation(snapshot, targets);
  return NextResponse.json({ rows, targets, totals: snapshot.totals });
});

const targetsSchema = z.object({
  targets: z
    .array(
      z.object({
        category: z.nativeEnum(AssetCategory),
        targetPercent: z.number().min(0).max(100),
      }),
    )
    .min(1),
});

export const PUT = withAuth(async (req) => {
  const body = await req.json();
  const parsed = targetsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const sum = parsed.data.targets.reduce((a, t) => a + t.targetPercent, 0);
  if (Math.abs(sum - 100) > 0.5) {
    return NextResponse.json({ error: `Targets must sum to 100 (got ${sum}).` }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.allocationTarget.deleteMany(),
    prisma.allocationTarget.createMany({ data: parsed.data.targets }),
  ]);

  const targets = await prisma.allocationTarget.findMany();
  return NextResponse.json({ targets });
});

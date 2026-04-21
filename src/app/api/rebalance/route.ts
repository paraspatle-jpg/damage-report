import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeAllocation } from "@/lib/allocation/analyzer";
import { getPortfolioSnapshot } from "@/lib/portfolio/service";
import { buildRebalancePlan } from "@/lib/rebalance/engine";
import { withAuth } from "@/lib/auth/guards";

export const GET = withAuth(async () => {
  const [snapshot, targets] = await Promise.all([
    getPortfolioSnapshot(),
    prisma.allocationTarget.findMany(),
  ]);
  const rows = analyzeAllocation(snapshot, targets);
  const plan = buildRebalancePlan(rows);
  return NextResponse.json({ plan, rows, totals: snapshot.totals });
});

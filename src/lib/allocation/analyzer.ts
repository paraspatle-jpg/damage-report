import type { AssetCategory, AllocationTarget } from "@prisma/client";
import type { CategoryBreakdown, PortfolioSnapshot } from "../portfolio/calc";
import { categoryLabel, formatInr } from "../format";

export type AllocationRow = {
  category: AssetCategory;
  currentPercent: number;
  targetPercent: number;
  deviationPoints: number;
  deltaValue: number;
  status: "ON_TARGET" | "UNDERWEIGHT" | "OVERWEIGHT";
  recommendation: string;
};

const DEVIATION_THRESHOLD = 5;

export function analyzeAllocation(
  snapshot: PortfolioSnapshot,
  targets: AllocationTarget[],
): AllocationRow[] {
  const totalValue = snapshot.totals.currentValue;
  const currentByCategory = new Map<AssetCategory, CategoryBreakdown>();
  snapshot.breakdown.forEach((b) => currentByCategory.set(b.category, b));

  const targetByCategory = new Map<AssetCategory, number>();
  targets.forEach((t) => targetByCategory.set(t.category, t.targetPercent));

  const allCategories = new Set<AssetCategory>([
    ...currentByCategory.keys(),
    ...targetByCategory.keys(),
  ]);

  const rows: AllocationRow[] = [];
  for (const category of allCategories) {
    const currentPercent = currentByCategory.get(category)?.allocationPercent ?? 0;
    const targetPercent = targetByCategory.get(category) ?? 0;
    const deviationPoints = currentPercent - targetPercent;
    const targetValue = (targetPercent / 100) * totalValue;
    const currentValue = currentByCategory.get(category)?.value ?? 0;
    const deltaValue = targetValue - currentValue;

    let status: AllocationRow["status"] = "ON_TARGET";
    if (Math.abs(deviationPoints) > DEVIATION_THRESHOLD) {
      status = deviationPoints > 0 ? "OVERWEIGHT" : "UNDERWEIGHT";
    }

    rows.push({
      category,
      currentPercent,
      targetPercent,
      deviationPoints,
      deltaValue,
      status,
      recommendation: buildRecommendation(category, status, deviationPoints, deltaValue),
    });
  }

  return rows.sort((a, b) => Math.abs(b.deviationPoints) - Math.abs(a.deviationPoints));
}

function buildRecommendation(
  category: AssetCategory,
  status: AllocationRow["status"],
  deviationPoints: number,
  deltaValue: number,
): string {
  const label = categoryLabel(category);
  if (status === "ON_TARGET") {
    return `${label} is on target. Continue normal contributions.`;
  }
  if (status === "OVERWEIGHT") {
    return `${label} is ${Math.abs(deviationPoints).toFixed(1)} pts over target → stop adding. Consider trimming ~${formatInr(
      Math.abs(deltaValue),
    )} on rebalance.`;
  }
  return `${label} is ${Math.abs(deviationPoints).toFixed(1)} pts under target → add ~${formatInr(
    Math.abs(deltaValue),
  )} on next buy.`;
}

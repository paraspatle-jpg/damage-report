import type { AssetCategory } from "@prisma/client";
import type { AllocationRow } from "../allocation/analyzer";
import { categoryLabel, formatInr } from "../format";

export type RebalanceTrade = {
  from: AssetCategory;
  to: AssetCategory;
  amount: number;
  text: string;
};

export type RebalancePlan = {
  trades: RebalanceTrade[];
  untradedOverweight: { category: AssetCategory; amount: number }[];
  untradedUnderweight: { category: AssetCategory; amount: number }[];
  totalTraded: number;
};

const DEVIATION_THRESHOLD = 5;
const MIN_TRADE_INR = 500;

export function buildRebalancePlan(rows: AllocationRow[]): RebalancePlan {
  const overweight = rows
    .filter((r) => r.status === "OVERWEIGHT" && Math.abs(r.deviationPoints) > DEVIATION_THRESHOLD)
    .map((r) => ({ category: r.category, amount: Math.abs(r.deltaValue) }))
    .sort((a, b) => b.amount - a.amount);

  const underweight = rows
    .filter((r) => r.status === "UNDERWEIGHT" && Math.abs(r.deviationPoints) > DEVIATION_THRESHOLD)
    .map((r) => ({ category: r.category, amount: Math.abs(r.deltaValue) }))
    .sort((a, b) => b.amount - a.amount);

  const trades: RebalanceTrade[] = [];

  let i = 0;
  let j = 0;
  while (i < overweight.length && j < underweight.length) {
    const src = overweight[i];
    const dst = underweight[j];
    const amount = Math.min(src.amount, dst.amount);

    if (amount >= MIN_TRADE_INR) {
      trades.push({
        from: src.category,
        to: dst.category,
        amount,
        text: `Move ${formatInr(amount)} from ${categoryLabel(src.category)} → ${categoryLabel(dst.category)}`,
      });
    }

    src.amount -= amount;
    dst.amount -= amount;
    if (src.amount < MIN_TRADE_INR) i += 1;
    if (dst.amount < MIN_TRADE_INR) j += 1;
  }

  return {
    trades,
    untradedOverweight: overweight.slice(i).filter((o) => o.amount >= MIN_TRADE_INR),
    untradedUnderweight: underweight.slice(j).filter((u) => u.amount >= MIN_TRADE_INR),
    totalTraded: trades.reduce((a, t) => a + t.amount, 0),
  };
}

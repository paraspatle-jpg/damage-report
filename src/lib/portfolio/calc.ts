import type { AssetCategory, Holding } from "@prisma/client";
import type { Quote } from "../market/provider";

export type ValuedHolding = {
  id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  allocationPercent: number;
  dayChangePercent?: number;
};

export type CategoryBreakdown = {
  category: AssetCategory;
  value: number;
  allocationPercent: number;
};

export type PortfolioSnapshot = {
  holdings: ValuedHolding[];
  totals: {
    invested: number;
    currentValue: number;
    pnl: number;
    pnlPercent: number;
  };
  breakdown: CategoryBreakdown[];
};

export function buildSnapshot(holdings: Holding[], quotes: Map<string, Quote>): PortfolioSnapshot {
  const valued: ValuedHolding[] = holdings.map((h) => {
    const q = quotes.get(h.symbol);
    const price = q?.price ?? h.buyPrice;
    const invested = h.quantity * h.buyPrice;
    const current = h.quantity * price;
    return {
      id: h.id,
      symbol: h.symbol,
      name: h.name ?? q?.name ?? h.symbol,
      category: h.category,
      quantity: h.quantity,
      buyPrice: h.buyPrice,
      currentPrice: price,
      investedValue: invested,
      currentValue: current,
      pnl: current - invested,
      pnlPercent: invested > 0 ? ((current - invested) / invested) * 100 : 0,
      allocationPercent: 0,
      dayChangePercent: q?.dayChangePercent,
    };
  });

  const totalCurrent = valued.reduce((a, v) => a + v.currentValue, 0);
  const totalInvested = valued.reduce((a, v) => a + v.investedValue, 0);

  valued.forEach((v) => {
    v.allocationPercent = totalCurrent > 0 ? (v.currentValue / totalCurrent) * 100 : 0;
  });

  const byCategory = new Map<AssetCategory, number>();
  valued.forEach((v) => byCategory.set(v.category, (byCategory.get(v.category) ?? 0) + v.currentValue));
  const breakdown: CategoryBreakdown[] = Array.from(byCategory.entries())
    .map(([category, value]) => ({
      category,
      value,
      allocationPercent: totalCurrent > 0 ? (value / totalCurrent) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    holdings: valued.sort((a, b) => b.currentValue - a.currentValue),
    totals: {
      invested: totalInvested,
      currentValue: totalCurrent,
      pnl: totalCurrent - totalInvested,
      pnlPercent: totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0,
    },
    breakdown,
  };
}

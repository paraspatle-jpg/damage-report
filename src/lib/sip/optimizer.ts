import type { Candle } from "../market/provider";

export type SipRecommendation = {
  baseAmount: number;
  multiplier: number;
  recommendedAmount: number;
  drawdownPercent: number;
  recentHigh: number;
  currentPrice: number;
  regime: "ATH" | "MILD_DIP" | "CORRECTION" | "DEEP_DISCOUNT" | "BEAR";
  headline: string;
  reason: string;
};

type Tier = {
  min: number;
  regime: SipRecommendation["regime"];
  multiplier: number;
  text: (drawdown: number) => string;
};

const TIERS: Tier[] = [
  {
    min: 20,
    regime: "BEAR",
    multiplier: 2.0,
    text: (d) => `Index is ${d.toFixed(1)}% off its high — deep bear territory. Double the SIP to compound the rebound.`,
  },
  {
    min: 10,
    regime: "DEEP_DISCOUNT",
    multiplier: 1.5,
    text: (d) => `Index is ${d.toFixed(1)}% off its high — meaningful correction. Add 50% to your SIP.`,
  },
  {
    min: 5,
    regime: "CORRECTION",
    multiplier: 1.25,
    text: (d) => `Index is ${d.toFixed(1)}% off its high. Nudge the SIP up 25%.`,
  },
  {
    min: 2,
    regime: "MILD_DIP",
    multiplier: 1.1,
    text: (d) => `Index is ${d.toFixed(1)}% off its high. Small top-up — 10% extra.`,
  },
];

export function optimiseSip(baseAmount: number, currentPrice: number, history: Candle[]): SipRecommendation {
  const recentHigh = Math.max(currentPrice, ...history.map((c) => c.high));
  const drawdownPercent = recentHigh > 0 ? ((recentHigh - currentPrice) / recentHigh) * 100 : 0;

  const tier = TIERS.find((t) => drawdownPercent >= t.min);
  if (tier) {
    return {
      baseAmount,
      multiplier: tier.multiplier,
      recommendedAmount: Math.round((baseAmount * tier.multiplier) / 100) * 100,
      drawdownPercent,
      recentHigh,
      currentPrice,
      regime: tier.regime,
      headline: regimeHeadline(tier.regime, tier.multiplier),
      reason: tier.text(drawdownPercent),
    };
  }

  return {
    baseAmount,
    multiplier: 1,
    recommendedAmount: baseAmount,
    drawdownPercent,
    recentHigh,
    currentPrice,
    regime: "ATH",
    headline: "Hold the line — base SIP",
    reason: "Index is near its recent high. Run the normal SIP; don't front-load at peaks.",
  };
}

function regimeHeadline(regime: SipRecommendation["regime"], multiplier: number): string {
  const pct = Math.round((multiplier - 1) * 100);
  switch (regime) {
    case "BEAR":
      return `Bear regime — SIP +${pct}%`;
    case "DEEP_DISCOUNT":
      return `Deep discount — SIP +${pct}%`;
    case "CORRECTION":
      return `Correction — SIP +${pct}%`;
    case "MILD_DIP":
      return `Mild dip — SIP +${pct}%`;
    case "ATH":
      return "Near highs — normal SIP";
  }
}

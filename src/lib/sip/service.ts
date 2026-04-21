import { prisma } from "../db";
import { marketProvider } from "../market/yahoo";
import { optimiseSip, type SipRecommendation } from "./optimizer";

export type SipPlanWithRec = {
  id: string;
  symbol: string;
  label: string;
  baseAmount: number;
  category: string;
  active: boolean;
  recommendation?: SipRecommendation;
  error?: string;
};

export async function listSipsWithRecommendations(): Promise<SipPlanWithRec[]> {
  const plans = await prisma.sipPlan.findMany({ orderBy: { createdAt: "asc" } });
  return Promise.all(
    plans.map(async (p): Promise<SipPlanWithRec> => {
      if (!p.active) {
        return { id: p.id, symbol: p.symbol, label: p.label, baseAmount: p.baseAmount, category: p.category, active: false };
      }
      try {
        const [quote, history] = await Promise.all([
          marketProvider.getQuote(p.symbol),
          marketProvider.getHistory(p.symbol, "1y"),
        ]);
        const recommendation = optimiseSip(p.baseAmount, quote.price, history);
        return {
          id: p.id,
          symbol: p.symbol,
          label: p.label,
          baseAmount: p.baseAmount,
          category: p.category,
          active: true,
          recommendation,
        };
      } catch (e) {
        return {
          id: p.id,
          symbol: p.symbol,
          label: p.label,
          baseAmount: p.baseAmount,
          category: p.category,
          active: true,
          error: (e as Error).message,
        };
      }
    }),
  );
}

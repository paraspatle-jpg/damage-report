import { prisma } from "../db";
import { marketProvider } from "../market/yahoo";
import { buildSnapshot, type PortfolioSnapshot } from "./calc";

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const holdings = await prisma.holding.findMany();
  if (holdings.length === 0) {
    return { holdings: [], totals: { invested: 0, currentValue: 0, pnl: 0, pnlPercent: 0 }, breakdown: [] };
  }
  const symbols = Array.from(new Set(holdings.map((h) => h.symbol)));
  const quoteList = await marketProvider.getQuotes(symbols).catch(() => []);
  const quotes = new Map(quoteList.map((q) => [q.symbol, q]));
  return buildSnapshot(holdings, quotes);
}

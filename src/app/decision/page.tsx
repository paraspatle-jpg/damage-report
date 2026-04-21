import { DecisionClient } from "./DecisionClient";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DecisionPage() {
  const holdings = await prisma.holding.findMany({ orderBy: { symbol: "asc" } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Decision Engine</h1>
        <p className="text-sm text-fgMuted">
          Runs RSI, MACD, breakout and volume checks against live data and returns a single action.
        </p>
      </div>
      <DecisionClient
        holdings={holdings.map((h) => ({ symbol: h.symbol, name: h.name ?? h.symbol, buyPrice: h.buyPrice }))}
      />
    </div>
  );
}

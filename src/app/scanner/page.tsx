import { prisma } from "@/lib/db";
import { DEFAULT_SCAN_UNIVERSE } from "@/lib/scanner/breakout";
import { ScannerClient } from "./ScannerClient";

export const dynamic = "force-dynamic";

export default async function ScannerPage() {
  const holdings = await prisma.holding.findMany({ select: { symbol: true } });
  const prefill = Array.from(
    new Set([...holdings.map((h) => h.symbol), ...DEFAULT_SCAN_UNIVERSE]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Breakout Scanner</h1>
        <p className="text-sm text-fgMuted">
          Flags symbols clearing recent highs with volume confirmation. Scans your holdings and common Indian ETFs/stocks by default.
        </p>
      </div>
      <ScannerClient initialSymbols={prefill} />
    </div>
  );
}

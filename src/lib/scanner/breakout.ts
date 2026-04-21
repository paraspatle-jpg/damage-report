import type { Candle } from "../market/provider";
import { marketProvider } from "../market/yahoo";
import { rsi, supportResistance, volumeSpike } from "../decision/indicators";

export type BreakoutCandidate = {
  symbol: string;
  name?: string;
  price: number;
  dayChangePercent?: number;
  recentHigh20: number;
  recentHigh50: number;
  volumeRatio: number;
  rsi: number;
  score: number;
  tags: string[];
  headline: string;
};

export type ScanResult = {
  candidates: BreakoutCandidate[];
  failures: { symbol: string; error: string }[];
  scannedAt: string;
};

const MIN_HISTORY = 55;

export async function scanBreakouts(symbols: string[]): Promise<ScanResult> {
  const unique = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));
  const results = await Promise.allSettled(
    unique.map(async (symbol) => {
      const [quote, candles] = await Promise.all([
        marketProvider.getQuote(symbol),
        marketProvider.getHistory(symbol, "6mo"),
      ]);
      return { symbol, quote, candles };
    }),
  );

  const candidates: BreakoutCandidate[] = [];
  const failures: ScanResult["failures"] = [];

  results.forEach((r, i) => {
    const symbol = unique[i];
    if (r.status === "rejected") {
      failures.push({ symbol, error: (r.reason as Error).message });
      return;
    }
    const { quote, candles } = r.value;
    if (candles.length < MIN_HISTORY) {
      failures.push({ symbol, error: "Not enough history" });
      return;
    }
    const candidate = evaluate(symbol, quote.price, quote.name, quote.dayChangePercent, candles);
    if (candidate) candidates.push(candidate);
  });

  candidates.sort((a, b) => b.score - a.score);
  return { candidates, failures, scannedAt: new Date().toISOString() };
}

function evaluate(
  symbol: string,
  price: number,
  name: string | undefined,
  dayChangePercent: number | undefined,
  candles: Candle[],
): BreakoutCandidate | null {
  const sr = supportResistance(candles);
  const vol = volumeSpike(candles);
  const closes = candles.map((c) => c.close);
  const rsiSeries = rsi(closes, 14);
  const latestRsi = rsiSeries[rsiSeries.length - 1];

  const tags: string[] = [];
  let score = 0;

  const breakout20 = price >= sr.recentHigh20 * 0.998;
  const breakout50 = price >= sr.recentHigh50 * 0.998;
  const volSpike = vol.ratio >= 1.5;
  const volHeavy = vol.ratio >= 2.5;

  if (breakout50) {
    score += 3;
    tags.push("50-day breakout");
  } else if (breakout20) {
    score += 2;
    tags.push("20-day breakout");
  }

  if (volHeavy) {
    score += 2;
    tags.push("Heavy volume");
  } else if (volSpike) {
    score += 1;
    tags.push("Volume spike");
  }

  if (Number.isFinite(latestRsi) && latestRsi >= 55 && latestRsi <= 72) {
    score += 1;
    tags.push("Momentum zone");
  } else if (Number.isFinite(latestRsi) && latestRsi > 78) {
    tags.push("Stretched RSI");
  }

  if (dayChangePercent !== undefined && dayChangePercent >= 2) {
    score += 1;
    tags.push("Strong day");
  }

  if (!breakout20 && !breakout50) return null;

  const headline = buildHeadline(symbol, breakout50, breakout20, volHeavy, volSpike);

  return {
    symbol,
    name,
    price,
    dayChangePercent,
    recentHigh20: sr.recentHigh20,
    recentHigh50: sr.recentHigh50,
    volumeRatio: vol.ratio,
    rsi: Number.isFinite(latestRsi) ? latestRsi : NaN,
    score,
    tags,
    headline,
  };
}

function buildHeadline(symbol: string, breakout50: boolean, breakout20: boolean, volHeavy: boolean, volSpike: boolean) {
  const bp = breakout50 ? "50-day high breakout" : breakout20 ? "20-day high breakout" : "";
  const vp = volHeavy ? " with heavy volume" : volSpike ? " with volume spike" : "";
  return `${symbol} → ${bp}${vp}`.trim();
}

export const DEFAULT_SCAN_UNIVERSE = [
  "NIFTYBEES.NS",
  "JUNIORBEES.NS",
  "BANKBEES.NS",
  "GOLDBEES.NS",
  "SILVERBEES.NS",
  "ITBEES.NS",
  "HFCL.NS",
  "TCS.NS",
  "RELIANCE.NS",
  "INFY.NS",
  "HDFCBANK.NS",
  "ICICIBANK.NS",
];

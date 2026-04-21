import type { Candle } from "../market/provider";
import { macd, rsi, supportResistance, volumeSpike } from "./indicators";

export type Action = "ADD" | "HOLD" | "PARTIAL_SELL" | "EXIT";

export type DecisionInput = {
  symbol: string;
  buyPrice?: number;
  currentPrice: number;
  candles: Candle[];
};

export type Signal = {
  label: string;
  direction: "bullish" | "bearish" | "neutral";
  weight: number;
  detail: string;
};

export type DecisionOutput = {
  symbol: string;
  action: Action;
  confidence: number;
  summary: string;
  reasons: string[];
  signals: Signal[];
  metrics: {
    rsi: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    support: number;
    resistance: number;
    recentHigh20: number;
    recentHigh50: number;
    volumeRatio: number;
    pnlPercent?: number;
  };
};

export function decide(input: DecisionInput): DecisionOutput {
  const { symbol, buyPrice, currentPrice, candles } = input;
  if (candles.length < 30) {
    return degenerate(symbol, currentPrice, buyPrice, "Not enough price history to compute reliable indicators.");
  }

  const closes = candles.map((c) => c.close);
  const rsiSeries = rsi(closes, 14);
  const macdSeries = macd(closes);
  const sr = supportResistance(candles);
  const vol = volumeSpike(candles);

  const latestRsi = rsiSeries[rsiSeries.length - 1];
  const latestMacd = macdSeries[macdSeries.length - 1];
  const prevMacd = macdSeries[macdSeries.length - 2] ?? latestMacd;

  const pnlPercent = buyPrice && buyPrice > 0 ? ((currentPrice - buyPrice) / buyPrice) * 100 : undefined;
  const signals: Signal[] = [];

  // RSI
  if (Number.isFinite(latestRsi)) {
    if (latestRsi > 70) {
      signals.push({
        label: "RSI overbought",
        direction: "bearish",
        weight: 0.8,
        detail: `RSI at ${latestRsi.toFixed(1)} — short-term pullback risk.`,
      });
    } else if (latestRsi < 30) {
      signals.push({
        label: "RSI oversold",
        direction: "bullish",
        weight: 0.8,
        detail: `RSI at ${latestRsi.toFixed(1)} — potential mean reversion.`,
      });
    } else if (latestRsi >= 50) {
      signals.push({
        label: "RSI in bullish zone",
        direction: "bullish",
        weight: 0.4,
        detail: `RSI at ${latestRsi.toFixed(1)} — momentum supports holders.`,
      });
    } else {
      signals.push({
        label: "RSI in bearish zone",
        direction: "bearish",
        weight: 0.4,
        detail: `RSI at ${latestRsi.toFixed(1)} — momentum weak.`,
      });
    }
  }

  // MACD
  if (Number.isFinite(latestMacd.histogram)) {
    const crossUp = prevMacd.histogram <= 0 && latestMacd.histogram > 0;
    const crossDown = prevMacd.histogram >= 0 && latestMacd.histogram < 0;
    if (crossUp) {
      signals.push({
        label: "MACD bullish crossover",
        direction: "bullish",
        weight: 1.0,
        detail: "Histogram flipped positive — trend turning up.",
      });
    } else if (crossDown) {
      signals.push({
        label: "MACD bearish crossover",
        direction: "bearish",
        weight: 1.0,
        detail: "Histogram flipped negative — trend turning down.",
      });
    } else if (latestMacd.histogram > 0) {
      signals.push({
        label: "MACD bullish",
        direction: "bullish",
        weight: 0.6,
        detail: "Histogram positive and holding.",
      });
    } else {
      signals.push({
        label: "MACD bearish",
        direction: "bearish",
        weight: 0.6,
        detail: "Histogram negative.",
      });
    }
  }

  // Support / Resistance breakout
  if (currentPrice >= sr.recentHigh20 * 0.998) {
    signals.push({
      label: "Breakout over 20-day high",
      direction: "bullish",
      weight: 1.0,
      detail: `Price ≥ 20-day high (${sr.recentHigh20.toFixed(2)}).`,
    });
  } else if (currentPrice >= sr.resistance) {
    signals.push({
      label: "At resistance",
      direction: "neutral",
      weight: 0.4,
      detail: `Near resistance ${sr.resistance.toFixed(2)} — needs confirmation.`,
    });
  } else if (currentPrice <= sr.support * 1.005) {
    signals.push({
      label: "At support",
      direction: "bullish",
      weight: 0.6,
      detail: `Near support ${sr.support.toFixed(2)} — better R:R for adds.`,
    });
  }

  // Volume
  if (vol.ratio >= 1.5) {
    signals.push({
      label: "Volume spike",
      direction: "bullish",
      weight: 0.6,
      detail: `Volume ${vol.ratio.toFixed(2)}× the 20-day average.`,
    });
  } else if (vol.ratio < 0.6) {
    signals.push({
      label: "Low volume",
      direction: "neutral",
      weight: 0.2,
      detail: `Volume ${vol.ratio.toFixed(2)}× average — weak conviction.`,
    });
  }

  // Position-level guardrails
  if (pnlPercent !== undefined) {
    if (pnlPercent <= -15) {
      signals.push({
        label: "Stop-loss zone",
        direction: "bearish",
        weight: 1.2,
        detail: `Down ${pnlPercent.toFixed(1)}% from entry — reassess thesis.`,
      });
    } else if (pnlPercent >= 40) {
      signals.push({
        label: "Large unrealized gain",
        direction: "neutral",
        weight: 0.6,
        detail: `Up ${pnlPercent.toFixed(1)}% — consider trailing stop or partial booking.`,
      });
    }
  }

  // Aggregate
  const bullScore = signals.filter((s) => s.direction === "bullish").reduce((a, s) => a + s.weight, 0);
  const bearScore = signals.filter((s) => s.direction === "bearish").reduce((a, s) => a + s.weight, 0);
  const total = bullScore + bearScore;
  const net = bullScore - bearScore;

  let action: Action;
  let summary: string;

  if (pnlPercent !== undefined && pnlPercent <= -15 && bearScore > bullScore) {
    action = "EXIT";
    summary = "Breach of stop-loss plus bearish confirmation — cut and redeploy.";
  } else if (net >= 1.2 && currentPrice >= sr.recentHigh20 * 0.998) {
    action = "ADD";
    summary = "Bullish confluence on a fresh breakout — scale in with trailing stop.";
  } else if (net >= 0.8) {
    action = "HOLD";
    summary = "Trend is intact; keep position and let winners run.";
  } else if (net <= -1.2) {
    action = pnlPercent !== undefined && pnlPercent > 10 ? "PARTIAL_SELL" : "EXIT";
    summary =
      action === "PARTIAL_SELL"
        ? "Momentum rolling over with gains on the table — book a portion."
        : "Momentum has broken down — exit and preserve capital.";
  } else if (net <= -0.4) {
    action = "PARTIAL_SELL";
    summary = "Weakening setup — reduce exposure, keep a runner.";
  } else {
    action = "HOLD";
    summary = "Signals are mixed — sit tight and wait for a clearer setup.";
  }

  const confidence = computeConfidence(net, total, signals.length);

  return {
    symbol,
    action,
    confidence,
    summary,
    reasons: signals.map((s) => s.detail),
    signals,
    metrics: {
      rsi: Number.isFinite(latestRsi) ? latestRsi : NaN,
      macd: latestMacd.macd,
      macdSignal: latestMacd.signal,
      macdHistogram: latestMacd.histogram,
      support: sr.support,
      resistance: sr.resistance,
      recentHigh20: sr.recentHigh20,
      recentHigh50: sr.recentHigh50,
      volumeRatio: vol.ratio,
      pnlPercent,
    },
  };
}

function computeConfidence(net: number, total: number, signalCount: number): number {
  if (total === 0 || signalCount === 0) return 40;
  const intensity = Math.min(1, Math.abs(net) / 3);
  const coverage = Math.min(1, signalCount / 5);
  const raw = 40 + intensity * 45 + coverage * 15;
  return Math.round(Math.max(10, Math.min(95, raw)));
}

function degenerate(symbol: string, currentPrice: number, buyPrice: number | undefined, note: string): DecisionOutput {
  return {
    symbol,
    action: "HOLD",
    confidence: 30,
    summary: note,
    reasons: [note],
    signals: [],
    metrics: {
      rsi: NaN,
      macd: NaN,
      macdSignal: NaN,
      macdHistogram: NaN,
      support: NaN,
      resistance: NaN,
      recentHigh20: NaN,
      recentHigh50: NaN,
      volumeRatio: NaN,
      pnlPercent:
        buyPrice && buyPrice > 0 ? ((currentPrice - buyPrice) / buyPrice) * 100 : undefined,
    },
  };
}

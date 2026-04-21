import type { Candle } from "../market/provider";

export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : NaN);
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out: number[] = [];
  const k = 2 / (period + 1);
  let prev = NaN;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(NaN);
      continue;
    }
    if (i === period - 1) {
      const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      prev = seed;
      out.push(seed);
      continue;
    }
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function rsi(values: number[], period = 14): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  if (values.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export type MacdPoint = { macd: number; signal: number; histogram: number };

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9): MacdPoint[] {
  const fastE = ema(values, fast);
  const slowE = ema(values, slow);
  const macdLine = values.map((_, i) =>
    Number.isFinite(fastE[i]) && Number.isFinite(slowE[i]) ? fastE[i] - slowE[i] : NaN,
  );
  const cleanMacd = macdLine.map((v) => (Number.isFinite(v) ? v : 0));
  const signalLine = ema(cleanMacd, signalPeriod);
  return values.map((_, i) => ({
    macd: macdLine[i],
    signal: signalLine[i],
    histogram: Number.isFinite(macdLine[i]) && Number.isFinite(signalLine[i]) ? macdLine[i] - signalLine[i] : NaN,
  }));
}

export type SupportResistance = {
  support: number;
  resistance: number;
  recentHigh20: number;
  recentHigh50: number;
  recentLow20: number;
};

export function supportResistance(candles: Candle[]): SupportResistance {
  const last20 = candles.slice(-20);
  const last50 = candles.slice(-50);
  const recentHigh20 = Math.max(...last20.map((c) => c.high));
  const recentHigh50 = Math.max(...last50.map((c) => c.high));
  const recentLow20 = Math.min(...last20.map((c) => c.low));

  const closes = last20.map((c) => c.close).sort((a, b) => a - b);
  const support = closes[Math.floor(closes.length * 0.1)] ?? recentLow20;
  const resistance = closes[Math.floor(closes.length * 0.9)] ?? recentHigh20;
  return { support, resistance, recentHigh20, recentHigh50, recentLow20 };
}

export function volumeSpike(candles: Candle[], lookback = 20): { latest: number; average: number; ratio: number } {
  const recent = candles.slice(-lookback - 1, -1);
  if (recent.length === 0) return { latest: 0, average: 0, ratio: 1 };
  const avg = recent.reduce((a, c) => a + c.volume, 0) / recent.length;
  const latest = candles[candles.length - 1]?.volume ?? 0;
  return { latest, average: avg, ratio: avg > 0 ? latest / avg : 1 };
}

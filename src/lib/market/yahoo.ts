import YahooFinance from "yahoo-finance2";
import type { Candle, HistoryRange, MarketProvider, Quote } from "./provider";

const silentLogger = {
  info: () => {},
  warn: () => {},
  error: (...args: unknown[]) => console.error(...args),
  debug: () => {},
  dir: () => {},
};

const yahooFinance = new YahooFinance({ logger: silentLogger });

type CacheEntry<T> = { value: T; expiresAt: number };

const QUOTE_TTL_MS = 60_000;
const HISTORY_TTL_MS = 15 * 60_000;

const quoteCache = new Map<string, CacheEntry<Quote>>();
const historyCache = new Map<string, CacheEntry<Candle[]>>();

function cacheGet<T>(store: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet<T>(store: Map<string, CacheEntry<T>>, key: string, value: T, ttl: number) {
  store.set(key, { value, expiresAt: Date.now() + ttl });
}

function rangeToPeriod(range: HistoryRange): { period1: Date } {
  const now = Date.now();
  const days: Record<HistoryRange, number> = {
    "1mo": 31,
    "3mo": 93,
    "6mo": 186,
    "1y": 370,
    "2y": 740,
  };
  return { period1: new Date(now - days[range] * 86_400_000) };
}

export class YahooProvider implements MarketProvider {
  async getQuote(symbol: string): Promise<Quote> {
    const cached = cacheGet(quoteCache, symbol);
    if (cached) return cached;

    const raw = await yahooFinance.quote(symbol);
    const quote: Quote = {
      symbol,
      price: Number(raw.regularMarketPrice ?? raw.postMarketPrice ?? 0),
      currency: raw.currency,
      previousClose: raw.regularMarketPreviousClose,
      dayChangePercent: raw.regularMarketChangePercent,
      name: raw.shortName ?? raw.longName ?? symbol,
    };
    cacheSet(quoteCache, symbol, quote, QUOTE_TTL_MS);
    return quote;
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];
    return Promise.all(symbols.map((s) => this.getQuote(s)));
  }

  async getHistory(symbol: string, range: HistoryRange): Promise<Candle[]> {
    const key = `${symbol}:${range}`;
    const cached = cacheGet(historyCache, key);
    if (cached) return cached;

    const { period1 } = rangeToPeriod(range);
    const rows = await yahooFinance.chart(symbol, { period1, interval: "1d" });
    const candles: Candle[] = (rows.quotes ?? [])
      .filter((q) => q.close != null && q.open != null)
      .map((q) => ({
        date: q.date,
        open: Number(q.open),
        high: Number(q.high),
        low: Number(q.low),
        close: Number(q.close),
        volume: Number(q.volume ?? 0),
      }));
    cacheSet(historyCache, key, candles, HISTORY_TTL_MS);
    return candles;
  }
}

export const marketProvider: MarketProvider = new YahooProvider();

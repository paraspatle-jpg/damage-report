export type Quote = {
  symbol: string;
  price: number;
  currency?: string;
  previousClose?: number;
  dayChangePercent?: number;
  name?: string;
};

export type Candle = {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type HistoryRange = "1mo" | "3mo" | "6mo" | "1y" | "2y";

export interface MarketProvider {
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getHistory(symbol: string, range: HistoryRange): Promise<Candle[]>;
}

import { AssetCategory } from "@prisma/client";

export type GrowwPreviewRow = {
  name: string;
  symbol: string;
  quantity: number;
  buyPrice: number;
  category: AssetCategory;
  include: boolean;
  error?: string;
};

export type ParseResult = {
  rows: GrowwPreviewRow[];
  skippedRows: number;
  detectedColumns: {
    name?: string;
    symbol?: string;
    isin?: string;
    quantity?: string;
    avgPrice?: string;
  };
  headers: string[];
};

const HEADER_ALIASES: Record<keyof ParseResult["detectedColumns"], string[]> = {
  name: ["stock name", "stockname", "instrument", "instrument name", "scheme name", "fund name", "name", "security name"],
  symbol: ["symbol", "stock symbol", "trading symbol", "scrip", "scrip code", "ticker", "tradingsymbol"],
  isin: ["isin", "isin code"],
  quantity: ["quantity", "qty", "units", "holdings quantity", "holding quantity", "shares"],
  avgPrice: [
    "average price",
    "average buy price",
    "avg price",
    "avg buy price",
    "average nav",
    "avg nav",
    "avg. cost",
    "average cost",
    "buy average",
    "buy avg price",
    "purchase price",
    "cost per unit",
  ],
};

export function parseGrowwCsv(text: string): ParseResult {
  const raw = parseCsv(text);
  if (raw.length < 2) {
    return { rows: [], skippedRows: 0, detectedColumns: {}, headers: [] };
  }

  const { headerIndex, headers } = findHeaderRow(raw);
  if (headerIndex === -1) {
    return { rows: [], skippedRows: raw.length, detectedColumns: {}, headers: [] };
  }

  const detectedColumns = detectColumns(headers);
  const dataRows = raw.slice(headerIndex + 1).filter((r) => r.some((cell) => cell.trim() !== ""));

  const rows: GrowwPreviewRow[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    const get = (header: string | undefined) => {
      if (!header) return "";
      const idx = headers.indexOf(header);
      return idx === -1 ? "" : (row[idx] ?? "").trim();
    };

    const name = get(detectedColumns.name);
    const rawSymbol = get(detectedColumns.symbol);
    const rawQty = get(detectedColumns.quantity);
    const rawAvg = get(detectedColumns.avgPrice);

    if (!name && !rawSymbol) {
      skipped += 1;
      continue;
    }

    const quantity = toNumber(rawQty);
    const buyPrice = toNumber(rawAvg);

    const resolved = resolveSymbol(rawSymbol, name);
    const category = detectCategory(resolved, name);

    const issues: string[] = [];
    if (!Number.isFinite(quantity) || quantity <= 0) issues.push("missing quantity");
    if (!Number.isFinite(buyPrice) || buyPrice <= 0) issues.push("missing avg price");
    if (!resolved) issues.push("unknown symbol");

    rows.push({
      name,
      symbol: resolved ?? "",
      quantity: Number.isFinite(quantity) ? quantity : 0,
      buyPrice: Number.isFinite(buyPrice) ? buyPrice : 0,
      category,
      include: issues.length === 0,
      error: issues.length ? issues.join("; ") : undefined,
    });
  }

  return { rows, skippedRows: skipped, detectedColumns, headers };
}

function findHeaderRow(raw: string[][]): { headerIndex: number; headers: string[] } {
  for (let i = 0; i < Math.min(raw.length, 10); i++) {
    const row = raw[i].map((s) => s.trim().toLowerCase());
    const hits = Object.values(HEADER_ALIASES).flat().filter((k) => row.includes(k)).length;
    if (hits >= 2) return { headerIndex: i, headers: raw[i].map((s) => s.trim()) };
  }
  return { headerIndex: -1, headers: [] };
}

function detectColumns(headers: string[]): ParseResult["detectedColumns"] {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const find = (candidates: string[]) => {
    const idx = lower.findIndex((h) => candidates.includes(h));
    return idx === -1 ? undefined : headers[idx];
  };
  return {
    name: find(HEADER_ALIASES.name),
    symbol: find(HEADER_ALIASES.symbol),
    isin: find(HEADER_ALIASES.isin),
    quantity: find(HEADER_ALIASES.quantity),
    avgPrice: find(HEADER_ALIASES.avgPrice),
  };
}

function toNumber(value: string): number {
  if (!value) return NaN;
  const cleaned = value.replace(/[₹,\s]/g, "").replace(/["']/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function resolveSymbol(rawSymbol: string, name: string): string {
  const sym = rawSymbol.trim().toUpperCase();
  if (sym) {
    if (/\.(NS|BO)$/i.test(sym)) return sym;
    if (/^[A-Z0-9&-]{1,20}$/.test(sym)) return `${sym}.NS`;
  }

  const upper = name.toUpperCase();
  const inferred = inferSymbolFromName(upper);
  return inferred ?? "";
}

const NAME_SYMBOL_HINTS: { pattern: RegExp; symbol: string }[] = [
  { pattern: /NIFTY\s*BEES/i, symbol: "NIFTYBEES.NS" },
  { pattern: /JUNIOR\s*BEES/i, symbol: "JUNIORBEES.NS" },
  { pattern: /GOLD\s*BEES/i, symbol: "GOLDBEES.NS" },
  { pattern: /SILVER\s*BEES/i, symbol: "SILVERBEES.NS" },
  { pattern: /BANK\s*BEES/i, symbol: "BANKBEES.NS" },
  { pattern: /IT\s*BEES/i, symbol: "ITBEES.NS" },
  { pattern: /PSU\s*BANK\s*BEES/i, symbol: "PSUBNKBEES.NS" },
  { pattern: /\bNIFTY\s*50\b.*ETF/i, symbol: "NIFTYBEES.NS" },
];

function inferSymbolFromName(upper: string): string | undefined {
  const hint = NAME_SYMBOL_HINTS.find((h) => h.pattern.test(upper));
  if (hint) return hint.symbol;
  return undefined;
}

function detectCategory(symbol: string, name: string): AssetCategory {
  const hay = `${symbol} ${name}`.toUpperCase();

  if (/GOLD|SILVER|COMMOD/.test(hay)) return AssetCategory.COMMODITY;

  const sectorHits = /(BANK|IT|PSU|PHARMA|AUTO|FMCG|ENERGY|INFRA|METAL|REALTY|CONSUMP|FIN\s*SERV)/;
  const indexHits = /(NIFTY|SENSEX|BSE|NEXT\s*50|MIDCAP|SMALLCAP|JUNIOR)/;

  if (/BEES|ETF/.test(hay)) {
    if (indexHits.test(hay) && !sectorHits.test(hay)) return AssetCategory.INDEX_ETF;
    if (sectorHits.test(hay)) return AssetCategory.SECTOR_ETF;
    return AssetCategory.INDEX_ETF;
  }

  if (/\bBOND\b|\bSGB\b|SOVEREIGN\s*GOLD/.test(hay)) return AssetCategory.BOND;

  return AssetCategory.STOCK;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  const normalised = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < normalised.length; i++) {
    const c = normalised[i];
    if (inQuotes) {
      if (c === '"' && normalised[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        current.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        current.push(field);
        rows.push(current);
        current = [];
        field = "";
        if (c === "\r" && normalised[i + 1] === "\n") i += 1;
      } else {
        field += c;
      }
    }
  }

  if (field !== "" || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}

"use client";

import { useState } from "react";
import type { DecisionOutput } from "@/lib/decision/engine";
import type { Quote } from "@/lib/market/provider";
import { formatNumber, formatPercent } from "@/lib/format";

type Holding = { symbol: string; name: string; buyPrice: number };

type ApiResult = { decision: DecisionOutput; quote: Quote };

export function DecisionClient({ holdings }: { holdings: Holding[] }) {
  const [symbol, setSymbol] = useState(holdings[0]?.symbol ?? "");
  const [buyPrice, setBuyPrice] = useState<string>(holdings[0]?.buyPrice?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/decision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        symbol: symbol.trim(),
        buyPrice: buyPrice ? Number(buyPrice) : undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to analyze.");
      return;
    }
    setResult(await res.json());
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <form className="card space-y-3 md:col-span-1" onSubmit={analyze}>
        <div>
          <label className="label">Symbol</label>
          <input
            className="input"
            value={symbol}
            onChange={(e) => {
              const v = e.target.value.toUpperCase();
              setSymbol(v);
              const match = holdings.find((h) => h.symbol === v);
              if (match) setBuyPrice(String(match.buyPrice));
            }}
            list="holding-symbols"
            placeholder="HFCL.NS"
          />
          <datalist id="holding-symbols">
            {holdings.map((h) => (
              <option key={h.symbol} value={h.symbol}>
                {h.name}
              </option>
            ))}
          </datalist>
        </div>
        <div>
          <label className="label">Your buy price (₹, optional)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="92"
          />
        </div>
        <button className="btn w-full" disabled={loading || !symbol}>
          {loading ? "Analyzing…" : "Run decision"}
        </button>
        {error && <div className="text-sm text-danger">{error}</div>}
        {holdings.length > 0 && (
          <div className="pt-2 text-xs text-fgMuted">
            Tip: click a holding to preload its buy price.
            <div className="mt-2 flex flex-wrap gap-1">
              {holdings.map((h) => (
                <button
                  key={h.symbol}
                  type="button"
                  onClick={() => {
                    setSymbol(h.symbol);
                    setBuyPrice(String(h.buyPrice));
                  }}
                  className="pill bg-surfaceMuted text-fg/75 transition hover:bg-surface hover:scale-105"
                >
                  {h.symbol}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      <div className="md:col-span-2">
        {result ? (
          <DecisionCard result={result} />
        ) : (
          <div className="card text-sm text-fgMuted">
            Pick a symbol and run the decision engine to see an action card.
          </div>
        )}
      </div>
    </div>
  );
}

const actionStyles: Record<DecisionOutput["action"], { label: string; tone: string }> = {
  ADD: { label: "Add", tone: "bg-accent text-white" },
  HOLD: { label: "Hold", tone: "bg-fg text-bg" },
  PARTIAL_SELL: { label: "Partial sell", tone: "bg-warn text-white" },
  EXIT: { label: "Exit", tone: "bg-danger text-white" },
};

function DecisionCard({ result }: { result: ApiResult }) {
  const { decision, quote } = result;
  const style = actionStyles[decision.action];

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-fgMuted">{decision.symbol}</div>
            <div className="text-lg font-semibold">{quote.name ?? decision.symbol}</div>
          </div>
          <span className={`action-badge animate-scale-in rounded-xl px-4 py-2 text-sm font-semibold ${style.tone}`}>
            {style.label}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Price" value={`₹${formatNumber(quote.price)}`} />
          <Stat
            label="Day change"
            value={quote.dayChangePercent !== undefined ? formatPercent(quote.dayChangePercent) : "—"}
            tone={quote.dayChangePercent !== undefined && quote.dayChangePercent >= 0 ? "up" : "down"}
          />
          <Stat
            label="Confidence"
            value={`${decision.confidence}%`}
            tone={decision.confidence >= 65 ? "up" : decision.confidence < 45 ? "down" : undefined}
          />
          <Stat
            label="P&L vs entry"
            value={
              decision.metrics.pnlPercent !== undefined
                ? formatPercent(decision.metrics.pnlPercent)
                : "—"
            }
            tone={
              decision.metrics.pnlPercent !== undefined
                ? decision.metrics.pnlPercent >= 0
                  ? "up"
                  : "down"
                : undefined
            }
          />
        </div>
        <div className="mt-4 rounded-xl bg-surfaceMuted px-4 py-3 text-sm">{decision.summary}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-semibold">Why</h3>
          <ul className="space-y-2 text-sm">
            {decision.signals.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className={`pill shrink-0 ${
                    s.direction === "bullish"
                      ? "bg-accent/10 text-accent"
                      : s.direction === "bearish"
                        ? "bg-danger/10 text-danger"
                        : "bg-surfaceMuted text-fgMuted"
                  }`}
                >
                  {s.label}
                </span>
                <span className="text-fg/75">{s.detail}</span>
              </li>
            ))}
            {decision.signals.length === 0 && <li className="text-fgMuted">No signals fired.</li>}
          </ul>
        </div>

        <div className="card">
          <h3 className="mb-3 font-semibold">Indicators</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="RSI(14)" value={formatNumber(decision.metrics.rsi, 1)} />
            <Metric label="MACD hist" value={formatNumber(decision.metrics.macdHistogram, 2)} />
            <Metric label="20-day high" value={`₹${formatNumber(decision.metrics.recentHigh20)}`} />
            <Metric label="50-day high" value={`₹${formatNumber(decision.metrics.recentHigh50)}`} />
            <Metric label="Support" value={`₹${formatNumber(decision.metrics.support)}`} />
            <Metric label="Resistance" value={`₹${formatNumber(decision.metrics.resistance)}`} />
            <Metric label="Volume ratio" value={`${formatNumber(decision.metrics.volumeRatio)}×`} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const color = tone === "up" ? "text-accent" : tone === "down" ? "text-danger" : "";
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-fgMuted">{label}</div>
      <div className={`mt-1 text-base font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-fgMuted">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

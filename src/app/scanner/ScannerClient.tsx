"use client";

import { useState } from "react";
import type { ScanResult } from "@/lib/scanner/breakout";
import { formatNumber, formatPercent } from "@/lib/format";

export function ScannerClient({ initialSymbols }: { initialSymbols: string[] }) {
  const [text, setText] = useState(initialSymbols.join(", "));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    const symbols = text
      .split(/[\s,]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (symbols.length === 0) {
      setLoading(false);
      setError("Add at least one symbol.");
      return;
    }
    const res = await fetch("/api/scanner", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbols }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Scan failed.");
      return;
    }
    setResult(await res.json());
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div>
          <label className="label">Symbols (comma or space separated, Yahoo format)</label>
          <textarea
            className="input min-h-[90px] font-mono text-xs"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn" onClick={run} disabled={loading}>
            {loading ? "Scanning…" : "Run scan"}
          </button>
          <div className="text-xs text-fgMuted">
            Up to 40 symbols. Uses daily data over last 6 months.
          </div>
        </div>
        {error && <div className="text-sm text-danger">{error}</div>}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Candidates</h2>
              <div className="text-xs text-fgMuted">Scanned {new Date(result.scannedAt).toLocaleString("en-IN")}</div>
            </div>
            {result.candidates.length === 0 ? (
              <div className="text-sm text-fgMuted">No breakouts detected in this universe. Try broadening the list.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="clean">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Headline</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Day</th>
                      <th className="text-right">20-day hi</th>
                      <th className="text-right">Vol×</th>
                      <th className="text-right">RSI</th>
                      <th>Tags</th>
                      <th className="text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.candidates.map((c) => (
                      <tr key={c.symbol}>
                        <td>
                          <div className="font-medium">{c.symbol}</div>
                          <div className="text-xs text-fgMuted">{c.name}</div>
                        </td>
                        <td className="text-sm">{c.headline}</td>
                        <td className="text-right tabular-nums">₹{formatNumber(c.price)}</td>
                        <td className="text-right tabular-nums">
                          {c.dayChangePercent !== undefined ? formatPercent(c.dayChangePercent) : "—"}
                        </td>
                        <td className="text-right tabular-nums">₹{formatNumber(c.recentHigh20)}</td>
                        <td className="text-right tabular-nums">{formatNumber(c.volumeRatio)}×</td>
                        <td className="text-right tabular-nums">{Number.isFinite(c.rsi) ? formatNumber(c.rsi, 1) : "—"}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {c.tags.map((t) => (
                              <span key={t} className="pill bg-accent/10 text-accent">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="text-right font-semibold tabular-nums">{c.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {result.failures.length > 0 && (
            <div className="card">
              <h3 className="mb-2 font-semibold">Skipped</h3>
              <ul className="space-y-1 text-xs text-fgMuted">
                {result.failures.map((f) => (
                  <li key={f.symbol}>
                    <span className="font-mono">{f.symbol}</span> — {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

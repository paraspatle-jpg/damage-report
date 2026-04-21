import Link from "next/link";
import { getPortfolioSnapshot } from "@/lib/portfolio/service";
import { categoryLabel, formatInr, formatPercent } from "@/lib/format";
import { PnlPill } from "@/components/PnlPill";
import { AddHoldingForm } from "./AddHoldingForm";
import { DeleteHoldingButton } from "./DeleteHoldingButton";
import { ImportGrowwDialog } from "./ImportGrowwDialog";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const snapshot = await getPortfolioSnapshot();
  const { holdings, totals, breakdown } = snapshot;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Portfolio</h1>
          <p className="text-sm text-fgMuted">Live value, P&amp;L, and allocation across your holdings.</p>
        </div>
        <ImportGrowwDialog />
      </div>

      <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Invested" value={formatInr(totals.invested)} />
        <Stat label="Current value" value={formatInr(totals.currentValue)} />
        <Stat label="P&L" value={formatInr(totals.pnl)} accent={totals.pnl >= 0 ? "up" : "down"} />
        <Stat label="Return" value={formatPercent(totals.pnlPercent)} accent={totals.pnlPercent >= 0 ? "up" : "down"} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card md:col-span-2">
          <h2 className="mb-3 font-semibold">Holdings</h2>
          {holdings.length === 0 ? (
            <div className="text-sm text-fgMuted">No holdings yet. Add one on the right.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="clean">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Category</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Avg buy</th>
                    <th className="text-right">LTP</th>
                    <th className="text-right">Value</th>
                    <th className="text-right">P&amp;L</th>
                    <th className="text-right">Alloc</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <div className="font-medium">{h.symbol}</div>
                        <div className="text-xs text-fgMuted">{h.name}</div>
                      </td>
                      <td>
                        <span className="pill bg-surfaceMuted text-fg/75">{categoryLabel(h.category)}</span>
                      </td>
                      <td className="text-right">{h.quantity}</td>
                      <td className="text-right">{formatInr(h.buyPrice)}</td>
                      <td className="text-right">{formatInr(h.currentPrice)}</td>
                      <td className="text-right">{formatInr(h.currentValue)}</td>
                      <td className="text-right">
                        <div>{formatInr(h.pnl)}</div>
                        <PnlPill value={h.pnlPercent} />
                      </td>
                      <td className="text-right">{h.allocationPercent.toFixed(1)}%</td>
                      <td className="text-right">
                        <DeleteHoldingButton id={h.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-3 font-semibold">Add holding</h2>
            <AddHoldingForm />
          </div>
          <div className="card">
            <h2 className="mb-3 font-semibold">Breakdown</h2>
            <div className="space-y-3">
              {breakdown.map((b) => (
                <div key={b.category}>
                  <div className="flex justify-between text-sm">
                    <span>{categoryLabel(b.category)}</span>
                    <span className="tabular-nums">{b.allocationPercent.toFixed(1)}%</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${Math.min(100, b.allocationPercent)}%` }}
                    />
                  </div>
                  <div className="text-xs text-fgMuted">{formatInr(b.value)}</div>
                </div>
              ))}
              {breakdown.length === 0 && <div className="text-sm text-fgMuted">No data yet.</div>}
            </div>
            <div className="mt-4 text-xs text-fgMuted">
              Target vs actual in{" "}
              <Link className="underline" href="/allocation">
                Allocation Analyzer →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "up" | "down" }) {
  const color = accent === "up" ? "text-accent" : accent === "down" ? "text-danger" : "";
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-fgMuted">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

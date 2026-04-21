import Link from "next/link";
import { prisma } from "@/lib/db";
import { analyzeAllocation } from "@/lib/allocation/analyzer";
import { getPortfolioSnapshot } from "@/lib/portfolio/service";
import { buildRebalancePlan } from "@/lib/rebalance/engine";
import { categoryLabel, formatInr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RebalancePage() {
  const [snapshot, targets] = await Promise.all([
    getPortfolioSnapshot(),
    prisma.allocationTarget.findMany(),
  ]);
  const rows = analyzeAllocation(snapshot, targets);
  const plan = buildRebalancePlan(rows);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Rebalancing Engine</h1>
        <p className="text-sm text-fgMuted">
          Pairs overweight categories against underweight ones and proposes concrete trades. Threshold: 5 points, min ₹500.
        </p>
      </div>

      <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Trades suggested" value={plan.trades.length.toString()} />
        <Stat label="Total to rotate" value={formatInr(plan.totalTraded)} />
        <Stat
          label="Portfolio value"
          value={formatInr(snapshot.totals.currentValue)}
        />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Proposed trades</h2>
        {plan.trades.length === 0 ? (
          <div className="text-sm text-fgMuted">
            Allocation is within ±5 points of target. No rebalancing needed —{" "}
            <Link href="/allocation" className="underline">
              review targets
            </Link>
            .
          </div>
        ) : (
          <ol className="stagger space-y-3 text-sm">
            {plan.trades.map((t, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="pill shrink-0 bg-fg text-bg">{i + 1}</span>
                <div>
                  <div className="font-medium">{t.text}</div>
                  <div className="text-xs text-fgMuted">
                    {categoryLabel(t.from)} → {categoryLabel(t.to)} · {formatInr(t.amount)}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {(plan.untradedOverweight.length > 0 || plan.untradedUnderweight.length > 0) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {plan.untradedOverweight.length > 0 && (
            <div className="card">
              <h3 className="mb-2 font-semibold">Still overweight after pairing</h3>
              <ul className="space-y-1 text-sm">
                {plan.untradedOverweight.map((o) => (
                  <li key={o.category} className="flex justify-between">
                    <span>{categoryLabel(o.category)}</span>
                    <span className="tabular-nums text-fgMuted">{formatInr(o.amount)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-xs text-fgMuted">Consider parking in cash until underweight buckets open up.</div>
            </div>
          )}
          {plan.untradedUnderweight.length > 0 && (
            <div className="card">
              <h3 className="mb-2 font-semibold">Still underweight</h3>
              <ul className="space-y-1 text-sm">
                {plan.untradedUnderweight.map((u) => (
                  <li key={u.category} className="flex justify-between">
                    <span>{categoryLabel(u.category)}</span>
                    <span className="tabular-nums text-fgMuted">{formatInr(u.amount)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-xs text-fgMuted">Deploy fresh capital here on the next SIP cycle.</div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3 className="mb-3 font-semibold">Category deviation</h3>
        <table className="clean">
          <thead>
            <tr>
              <th>Category</th>
              <th className="text-right">Current</th>
              <th className="text-right">Target</th>
              <th className="text-right">Deviation</th>
              <th className="text-right">Δ value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.category}>
                <td>{categoryLabel(r.category)}</td>
                <td className="text-right tabular-nums">{r.currentPercent.toFixed(1)}%</td>
                <td className="text-right tabular-nums">{r.targetPercent.toFixed(1)}%</td>
                <td className={`text-right tabular-nums ${Math.abs(r.deviationPoints) > 5 ? "text-danger" : "text-fgMuted"}`}>
                  {r.deviationPoints >= 0 ? "+" : ""}
                  {r.deviationPoints.toFixed(1)}
                </td>
                <td className="text-right tabular-nums">{formatInr(r.deltaValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-fgMuted">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

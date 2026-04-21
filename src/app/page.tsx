import Link from "next/link";
import { prisma } from "@/lib/db";
import { getPortfolioSnapshot } from "@/lib/portfolio/service";
import { analyzeAllocation } from "@/lib/allocation/analyzer";
import { buildRebalancePlan } from "@/lib/rebalance/engine";
import { listSipsWithRecommendations } from "@/lib/sip/service";
import { getJournalView } from "@/lib/journal/service";
import { categoryLabel, formatInr, formatPercent } from "@/lib/format";
import { CountUp } from "@/components/CountUp";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [snapshot, targets, sipPlans, journalView] = await Promise.all([
    getPortfolioSnapshot(),
    prisma.allocationTarget.findMany(),
    listSipsWithRecommendations(),
    getJournalView(),
  ]);
  const allocation = analyzeAllocation(snapshot, targets);
  const flagged = allocation.filter((r) => r.status !== "ON_TARGET");
  const plan = buildRebalancePlan(allocation);
  const sipBase = sipPlans.reduce((a, p) => a + p.baseAmount, 0);
  const sipMonth = sipPlans.reduce((a, p) => a + (p.recommendation?.recommendedAmount ?? p.baseAmount), 0);
  const topInsight = journalView.insights[0];
  const topMovers = [...snapshot.holdings]
    .filter((h) => Number.isFinite(h.pnlPercent))
    .sort((a, b) => Math.abs(b.pnlPercent) - Math.abs(a.pnlPercent))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-fgMuted">One page. What&apos;s working, what needs attention, what to do next.</p>
        </div>
      </div>

      <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-4">
        <AnimatedStat label="Invested" value={snapshot.totals.invested} format="inr" />
        <AnimatedStat label="Current" value={snapshot.totals.currentValue} format="inr" />
        <AnimatedStat
          label="P&L"
          value={snapshot.totals.pnl}
          format="inr"
          tone={snapshot.totals.pnl >= 0 ? "up" : "down"}
        />
        <AnimatedStat
          label="Return"
          value={snapshot.totals.pnlPercent}
          format="percent"
          tone={snapshot.totals.pnlPercent >= 0 ? "up" : "down"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">What needs attention</h2>
            <Link href="/allocation" className="text-xs text-fgMuted hover:underline">
              Open allocation →
            </Link>
          </div>
          {flagged.length === 0 ? (
            <div className="text-sm text-fgMuted">Allocation is within 5 points of target across the board.</div>
          ) : (
            <ul className="space-y-3 text-sm">
              {flagged.map((r) => (
                <li key={r.category} className="flex items-start gap-3">
                  <span
                    className={`pill shrink-0 ${
                      r.status === "OVERWEIGHT" ? "bg-danger/10 text-danger" : "bg-warn/10 text-warn"
                    }`}
                  >
                    {r.status === "OVERWEIGHT" ? "Overweight" : "Underweight"}
                  </span>
                  <div>
                    <div className="font-medium">{categoryLabel(r.category)}</div>
                    <div className="text-fg/75">{r.recommendation}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Biggest movers</h2>
          {topMovers.length === 0 ? (
            <div className="text-sm text-fgMuted">Add holdings to see movers.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {topMovers.map((h) => (
                <li key={h.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{h.symbol}</div>
                    <div className="text-xs text-fgMuted">{categoryLabel(h.category)}</div>
                  </div>
                  <span
                    className={`tabular-nums font-medium ${h.pnlPercent >= 0 ? "text-accent" : "text-danger"}`}
                  >
                    {formatPercent(h.pnlPercent)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/decision" className="mt-4 block text-xs text-fgMuted hover:underline">
            Run decision engine →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">This month&apos;s SIP</h2>
            <Link href="/sip" className="text-xs text-fgMuted hover:underline">
              Open SIP →
            </Link>
          </div>
          {sipPlans.length === 0 ? (
            <div className="text-sm text-fgMuted">No SIP plans yet.</div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-semibold tabular-nums">{formatInr(sipMonth)}</div>
                {sipBase > 0 && sipMonth !== sipBase && (
                  <div className="text-xs text-fgMuted">
                    vs base {formatInr(sipBase)} ({sipMonth > sipBase ? "+" : ""}
                    {(((sipMonth - sipBase) / sipBase) * 100).toFixed(1)}%)
                  </div>
                )}
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {sipPlans.slice(0, 3).map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span>{p.label}</span>
                    <span className="tabular-nums text-fg/75">
                      {p.recommendation ? formatInr(p.recommendation.recommendedAmount) : formatInr(p.baseAmount)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Journal insight</h2>
            <Link href="/journal" className="text-xs text-fgMuted hover:underline">
              Open journal →
            </Link>
          </div>
          {topInsight ? (
            <>
              <div className="font-medium">{topInsight.title}</div>
              <div className="mt-1 text-sm text-fg/75">{topInsight.detail}</div>
            </>
          ) : (
            <div className="text-sm text-fgMuted">No journal entries yet.</div>
          )}
        </div>
      </div>

      {plan.trades.length > 0 && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Next rebalancing moves</h2>
            <Link href="/rebalance" className="text-xs text-fgMuted hover:underline">
              Full plan →
            </Link>
          </div>
          <ol className="space-y-2 text-sm">
            {plan.trades.slice(0, 3).map((t, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="pill shrink-0 bg-fg text-bg">{i + 1}</span>
                <span>{t.text}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/portfolio" className="card hover:shadow-md">
          <div className="text-sm font-semibold">Portfolio Manager</div>
          <div className="mt-1 text-xs text-fgMuted">Add holdings, track P&amp;L and allocation.</div>
        </Link>
        <Link href="/allocation" className="card hover:shadow-md">
          <div className="text-sm font-semibold">Allocation Analyzer</div>
          <div className="mt-1 text-xs text-fgMuted">Current vs target with recommendations.</div>
        </Link>
        <Link href="/rebalance" className="card hover:shadow-md">
          <div className="text-sm font-semibold">Rebalancing Engine</div>
          <div className="mt-1 text-xs text-fgMuted">Concrete sell→buy trades when drift &gt; 5 pts.</div>
        </Link>
        <Link href="/decision" className="card hover:shadow-md">
          <div className="text-sm font-semibold">Decision Engine</div>
          <div className="mt-1 text-xs text-fgMuted">Per-symbol action: Add / Hold / Reduce / Exit.</div>
        </Link>
        <Link href="/scanner" className="card hover:shadow-md">
          <div className="text-sm font-semibold">Breakout Scanner</div>
          <div className="mt-1 text-xs text-fgMuted">Symbols clearing 20/50-day highs with volume.</div>
        </Link>
        <Link href="/sip" className="card hover:shadow-md">
          <div className="text-sm font-semibold">Smart SIP</div>
          <div className="mt-1 text-xs text-fgMuted">Scales SIPs up into drawdowns, normal near highs.</div>
        </Link>
        <Link href="/journal" className="card hover:shadow-md">
          <div className="text-sm font-semibold">Trade Journal</div>
          <div className="mt-1 text-xs text-fgMuted">Log decisions and surface behavioural patterns.</div>
        </Link>
      </div>
    </div>
  );
}

function AnimatedStat({
  label,
  value,
  format,
  tone,
}: {
  label: string;
  value: number;
  format: "inr" | "percent" | "number";
  tone?: "up" | "down";
}) {
  const color = tone === "up" ? "text-accent" : tone === "down" ? "text-danger" : "";
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-fgMuted">{label}</div>
      <CountUp
        value={value}
        format={format}
        className={`mt-1 block text-xl font-semibold tabular-nums ${color}`}
      />
    </div>
  );
}

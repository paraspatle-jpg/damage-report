import { prisma } from "@/lib/db";
import { getPortfolioSnapshot } from "@/lib/portfolio/service";
import { analyzeAllocation } from "@/lib/allocation/analyzer";
import { categoryLabel, formatInr } from "@/lib/format";
import { TargetsEditor } from "./TargetsEditor";

export const dynamic = "force-dynamic";

export default async function AllocationPage() {
  const [snapshot, targets] = await Promise.all([
    getPortfolioSnapshot(),
    prisma.allocationTarget.findMany({ orderBy: { category: "asc" } }),
  ]);
  const rows = analyzeAllocation(snapshot, targets);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Allocation Analyzer</h1>
        <p className="text-sm text-fgMuted">
          Compares your current mix against target weights. Deviations &gt; 5 points are flagged.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card md:col-span-2">
          <h2 className="mb-3 font-semibold">Current vs target</h2>
          <div className="stagger space-y-4">
            {rows.map((r) => {
              const max = Math.max(r.currentPercent, r.targetPercent, 1);
              return (
                <div key={r.category}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="font-medium">{categoryLabel(r.category)}</div>
                    <StatusTag status={r.status} />
                  </div>
                  <div className="space-y-1">
                    <Bar label="Current" value={r.currentPercent} max={max} tone="ink" />
                    <Bar label="Target" value={r.targetPercent} max={max} tone="muted" />
                  </div>
                  <div className="mt-2 text-sm text-fg/75">{r.recommendation}</div>
                  {r.status !== "ON_TARGET" && (
                    <div className="mt-1 text-xs text-fgMuted">
                      Delta to target: {formatInr(r.deltaValue)}
                    </div>
                  )}
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="text-sm text-fgMuted">No targets configured yet.</div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Targets</h2>
          <p className="mb-3 text-xs text-fgMuted">Must sum to 100%.</p>
          <TargetsEditor initial={targets.map((t) => ({ category: t.category, targetPercent: t.targetPercent }))} />
        </div>
      </div>
    </div>
  );
}

function StatusTag({ status }: { status: "ON_TARGET" | "UNDERWEIGHT" | "OVERWEIGHT" }) {
  const map = {
    ON_TARGET: "bg-accent/10 text-accent",
    UNDERWEIGHT: "bg-warn/10 text-warn",
    OVERWEIGHT: "bg-danger/10 text-danger",
  } as const;
  const label = status === "ON_TARGET" ? "On target" : status === "UNDERWEIGHT" ? "Underweight" : "Overweight";
  return <span className={`pill ${map[status]}`}>{label}</span>;
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: "ink" | "muted" }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 text-xs text-fgMuted">{label}</div>
      <div className="bar-track flex-1">
        <div
          className={`bar-fill ${tone === "ink" ? "" : "muted"}`}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
      <div className="w-12 text-right text-xs tabular-nums">{value.toFixed(1)}%</div>
    </div>
  );
}

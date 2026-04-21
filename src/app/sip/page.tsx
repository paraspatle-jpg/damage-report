import { listSipsWithRecommendations } from "@/lib/sip/service";
import { categoryLabel, formatInr, formatNumber } from "@/lib/format";
import { AddSipForm } from "./AddSipForm";
import { DeleteSipButton } from "./DeleteSipButton";

export const dynamic = "force-dynamic";

const REGIME_TONE: Record<string, string> = {
  ATH: "bg-surfaceMuted text-fg/75",
  MILD_DIP: "bg-warn/10 text-warn",
  CORRECTION: "bg-warn/10 text-warn",
  DEEP_DISCOUNT: "bg-accent/10 text-accent",
  BEAR: "bg-accent/10 text-accent",
};

export default async function SipPage() {
  const plans = await listSipsWithRecommendations();
  const totalBase = plans.reduce((a, p) => a + p.baseAmount, 0);
  const totalRecommended = plans.reduce((a, p) => a + (p.recommendation?.recommendedAmount ?? p.baseAmount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Smart SIP Optimizer</h1>
        <p className="text-sm text-fgMuted">
          Tilts each SIP up on drawdowns and holds steady near highs. Tiers: −2% → +10%, −5% → +25%, −10% → +50%, −20% → +100%.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Base monthly SIP" value={formatInr(totalBase)} />
        <Stat label="This month" value={formatInr(totalRecommended)} tone={totalRecommended > totalBase ? "up" : undefined} />
        <Stat
          label="Change"
          value={totalBase > 0 ? `${(((totalRecommended - totalBase) / totalBase) * 100).toFixed(1)}%` : "—"}
          tone={totalRecommended > totalBase ? "up" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card md:col-span-2">
          <h2 className="mb-3 font-semibold">Plans</h2>
          {plans.length === 0 ? (
            <div className="text-sm text-fgMuted">No SIP plans yet. Add one on the right.</div>
          ) : (
            <div className="stagger space-y-4">
              {plans.map((p) => {
                const rec = p.recommendation;
                return (
                  <div key={p.id} className="rounded-xl border border-fg/[.08] p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-fgMuted">
                          {p.symbol} · {categoryLabel(p.category)}
                        </div>
                        <div className="text-base font-semibold">{p.label}</div>
                      </div>
                      {rec && (
                        <span className={`pill ${REGIME_TONE[rec.regime] ?? "bg-surfaceMuted text-fg/75"}`}>
                          {rec.headline}
                        </span>
                      )}
                    </div>

                    {p.error ? (
                      <div className="mt-3 text-sm text-danger">Could not fetch data: {p.error}</div>
                    ) : rec ? (
                      <>
                        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                          <Metric label="Base" value={formatInr(p.baseAmount)} />
                          <Metric
                            label="This month"
                            value={formatInr(rec.recommendedAmount)}
                            tone={rec.multiplier > 1 ? "up" : undefined}
                          />
                          <Metric label="Drawdown" value={`${formatNumber(rec.drawdownPercent, 1)}%`} />
                          <Metric label="Price / 52w high" value={`₹${formatNumber(rec.currentPrice)} / ₹${formatNumber(rec.recentHigh)}`} />
                        </div>
                        <div className="mt-3 rounded-xl bg-surfaceMuted px-3 py-2 text-sm text-fg/80">{rec.reason}</div>
                      </>
                    ) : (
                      <div className="mt-3 text-sm text-fgMuted">Plan is paused.</div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <DeleteSipButton id={p.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Add SIP plan</h2>
          <AddSipForm />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-fgMuted">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${tone === "up" ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "up" }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-fgMuted">{label}</div>
      <div className={`text-sm font-medium tabular-nums ${tone === "up" ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}

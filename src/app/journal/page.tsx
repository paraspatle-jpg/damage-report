import { getJournalView } from "@/lib/journal/service";
import { formatInr, formatNumber, formatPercent } from "@/lib/format";
import { AddJournalForm } from "./AddJournalForm";
import { DeleteEntryButton } from "./DeleteEntryButton";

export const dynamic = "force-dynamic";

const TONE_STYLE: Record<string, string> = {
  warn: "bg-warn/10 text-warn",
  good: "bg-accent/10 text-accent",
  info: "bg-surfaceMuted text-fg/75",
};

const VERDICT_STYLE: Record<string, string> = {
  CORRECT: "bg-accent/10 text-accent",
  REGRETTED: "bg-danger/10 text-danger",
  NEUTRAL: "bg-surfaceMuted text-fgMuted",
};

export default async function JournalPage() {
  const { reviewed, insights } = await getJournalView();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trade Journal</h1>
        <p className="text-sm text-fgMuted">
          Log the reason and emotion before you trade. InvestOS grades each entry and surfaces patterns in your behaviour.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Patterns</h2>
        <ul className="stagger space-y-3 text-sm">
          {insights.map((i) => (
            <li key={i.code} className="flex items-start gap-3">
              <span className={`pill shrink-0 ${TONE_STYLE[i.tone]}`}>
                {i.tone === "warn" ? "Watch" : i.tone === "good" ? "Working" : "Note"}
              </span>
              <div>
                <div className="font-medium">{i.title}</div>
                <div className="text-fg/75">{i.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card md:col-span-2">
          <h2 className="mb-3 font-semibold">Entries</h2>
          {reviewed.length === 0 ? (
            <div className="text-sm text-fgMuted">No entries yet. Log your next trade on the right.</div>
          ) : (
            <div className="stagger space-y-3">
              {reviewed.map((r) => (
                <div key={r.entry.id} className="rounded-xl border border-fg/[.08] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-fgMuted">
                        {new Date(r.entry.createdAt).toLocaleString("en-IN")} · {r.daysSince}d ago
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`pill ${
                            r.entry.action === "BUY"
                              ? "bg-accent/10 text-accent"
                              : r.entry.action === "SELL"
                                ? "bg-danger/10 text-danger"
                                : "bg-surfaceMuted text-fg/75"
                          }`}
                        >
                          {r.entry.action}
                        </span>
                        <span className="font-semibold">{r.entry.symbol}</span>
                        <span className="text-sm text-fgMuted">
                          {formatNumber(r.entry.quantity, 2)} @ {formatInr(r.entry.price)}
                        </span>
                      </div>
                      {r.entry.emotion && (
                        <div className="mt-1 text-xs text-fgMuted">Emotion: {r.entry.emotion}</div>
                      )}
                    </div>
                    {r.verdict && (
                      <span className={`pill ${VERDICT_STYLE[r.verdict]}`}>
                        {r.verdict === "CORRECT" ? "Aged well" : r.verdict === "REGRETTED" ? "Regretted" : "Neutral"}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 text-sm text-fg/85">{r.entry.reason}</div>

                  {r.currentPrice !== undefined && r.outcomePercent !== undefined && (
                    <div className="mt-3 flex items-center gap-4 text-xs text-fgMuted">
                      <span>
                        Now: <span className="tabular-nums text-fg/85">{formatInr(r.currentPrice)}</span>
                      </span>
                      <span
                        className={`tabular-nums ${r.outcomePercent >= 0 ? "text-accent" : "text-danger"}`}
                      >
                        {formatPercent(r.outcomePercent)} since decision
                      </span>
                      {r.note && <span className="text-fgMuted">· {r.note}</span>}
                    </div>
                  )}

                  <div className="mt-2 flex justify-end">
                    <DeleteEntryButton id={r.entry.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Log decision</h2>
          <AddJournalForm />
        </div>
      </div>
    </div>
  );
}

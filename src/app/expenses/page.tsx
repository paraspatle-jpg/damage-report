import { getExpensesView } from "@/lib/expenses/service";
import { formatInr, formatPercent } from "@/lib/format";
import { AddExpenseForm } from "./AddExpenseForm";
import { DeleteTxnButton } from "./DeleteTxnButton";
import { SettleButton } from "./SettleButton";

export const dynamic = "force-dynamic";

const TYPE_STYLE: Record<string, string> = {
  EXPENSE: "bg-danger/10 text-danger",
  CREDIT: "bg-accent/10 text-accent",
  TRANSFER: "bg-surfaceMuted text-fg/75",
};

const CAT_STYLE: Record<string, string> = {
  NEED: "bg-warn/10 text-warn",
  WANT: "bg-surfaceMuted text-fg/75",
  INVESTMENT: "bg-accent/10 text-accent",
  INCOME: "bg-accent/10 text-accent",
};

const INSIGHT_TONE: Record<string, string> = {
  warn: "bg-warn/10 text-warn",
  good: "bg-accent/10 text-accent",
  info: "bg-surfaceMuted text-fg/75",
};

function InsightBadge({ tone }: { tone: string }) {
  const label = tone === "warn" ? "Watch" : tone === "good" ? "Good" : "Note";
  return <span className={`pill shrink-0 ${INSIGHT_TONE[tone]}`}>{label}</span>;
}

export default async function ExpensesPage() {
  const { categories, recent, summary, insights } = await getExpensesView();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <p className="text-sm text-fgMuted">
          {summary.month} · track every rupee in and out, and what&apos;s owed from group outings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card">
          <div className="text-xs text-fgMuted">Income</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-accent">
            {formatInr(summary.income)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-fgMuted">Expenses</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-danger">
            {formatInr(summary.expenses)}
          </div>
          {summary.investments > 0 && (
            <div className="text-xs text-fgMuted">+ {formatInr(summary.investments)} invested</div>
          )}
        </div>
        <div className="card">
          <div className="text-xs text-fgMuted">Savings rate</div>
          <div
            className={`mt-1 text-xl font-semibold tabular-nums ${
              summary.savingsRate >= 0.3
                ? "text-accent"
                : summary.savingsRate >= 0.1
                  ? "text-fg"
                  : "text-danger"
            }`}
          >
            {summary.income > 0 ? formatPercent(summary.savingsRate * 100, 0) : "—"}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-fgMuted">Owed to you</div>
          <div
            className={`mt-1 text-xl font-semibold tabular-nums ${
              summary.receivable > 0 ? "text-warn" : "text-fg/60"
            }`}
          >
            {formatInr(summary.receivable)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Insights</h2>
          {summary.topCategories.length > 0 && (
            <div className="flex flex-wrap gap-1 text-xs text-fgMuted">
              {summary.topCategories.map((c) => (
                <span key={c.name} className="pill bg-surfaceMuted">
                  {c.name} · {formatInr(c.total)}
                </span>
              ))}
            </div>
          )}
        </div>
        <ul className="stagger space-y-3 text-sm">
          {insights.map((i) => (
            <li key={i.code} className="flex items-start gap-3">
              <InsightBadge tone={i.tone} />
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
          <h2 className="mb-3 font-semibold">Recent</h2>
          {recent.length === 0 ? (
            <div className="text-sm text-fgMuted">
              Nothing logged yet. Add your first transaction on the right.
            </div>
          ) : (
            <div className="stagger space-y-2">
              {recent.map((t) => {
                const shared = t.type === "EXPENSE" && t.myShare != null && t.myShare < t.amount;
                const owed = shared ? t.amount - (t.myShare ?? 0) : 0;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-fg/[.08] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`pill ${TYPE_STYLE[t.type]}`}>{t.type}</span>
                        <span className={`pill ${CAT_STYLE[t.category.type]}`}>{t.category.name}</span>
                        {t.isRecurring && (
                          <span className="pill bg-surfaceMuted text-fgMuted">recurring</span>
                        )}
                        {shared && (
                          <SettleButton id={t.id} settled={t.settledAt != null} />
                        )}
                        {t.source !== "manual" && (
                          <span className="pill bg-surfaceMuted text-fgMuted">{t.source}</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-fg/85">
                        {t.merchant ?? t.note ?? "—"}
                        {t.merchant && t.note && (
                          <span className="text-fgMuted"> · {t.note}</span>
                        )}
                      </div>
                      <div className="text-xs text-fgMuted">
                        {new Date(t.occurredAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        {shared && t.splitWith && (
                          <span> · with {t.splitWith}</span>
                        )}
                        {shared && (
                          <span>
                            {" · you paid "}
                            {formatInr(t.amount)}
                            {", your share "}
                            {formatInr(t.myShare ?? 0)}
                            {!t.settledAt && owed > 0 && (
                              <span className="text-warn"> · {formatInr(owed)} owed</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`tabular-nums font-semibold ${
                          t.type === "EXPENSE"
                            ? "text-danger"
                            : t.type === "CREDIT"
                              ? "text-accent"
                              : "text-fg/85"
                        }`}
                      >
                        {t.type === "EXPENSE" ? "−" : t.type === "CREDIT" ? "+" : ""}
                        {formatInr(shared ? (t.myShare ?? 0) : t.amount)}
                      </div>
                      <DeleteTxnButton id={t.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Add transaction</h2>
          <AddExpenseForm categories={categories} />
        </div>
      </div>
    </div>
  );
}

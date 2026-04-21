import type { Category, Transaction } from "@prisma/client";

export type InsightTone = "warn" | "good" | "info";

export type Insight = {
  code: string;
  tone: InsightTone;
  title: string;
  detail: string;
};

type TxnWithCategory = Transaction & { category: Category };

type Params = {
  monthStart: Date;
  now: Date;
  currentMonth: TxnWithCategory[];
  trailing: TxnWithCategory[];
  categories: Category[];
};

function inr(v: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(v));
}

function sumByCategory(txns: TxnWithCategory[], type: "EXPENSE" | "CREDIT") {
  const map = new Map<string, { name: string; total: number }>();
  for (const t of txns) {
    if (t.type !== type) continue;
    const cost = type === "EXPENSE" ? (t.myShare ?? t.amount) : t.amount;
    const existing = map.get(t.categoryId);
    if (existing) existing.total += cost;
    else map.set(t.categoryId, { name: t.category.name, total: cost });
  }
  return map;
}

export function computeInsights({ monthStart, now, currentMonth, trailing, categories }: Params): Insight[] {
  const out: Insight[] = [];
  const daysElapsed = Math.max(1, Math.floor((now.getTime() - monthStart.getTime()) / 86_400_000) + 1);
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const paceFactor = daysElapsed / daysInMonth;

  const thisMonthByCat = sumByCategory(currentMonth, "EXPENSE");

  // ── 1. Category overspend ─────────────────────────────────────────────
  // Budgeted categories: flag when pace > 115% of proportional budget.
  // Unbudgeted: flag when MTD > 130% of trailing 3-month average for same elapsed-day window.
  const trailingByMonth = new Map<string, Map<string, number>>();
  for (const t of trailing) {
    if (t.type !== "EXPENSE") continue;
    const key = `${t.occurredAt.getFullYear()}-${t.occurredAt.getMonth()}`;
    let m = trailingByMonth.get(key);
    if (!m) trailingByMonth.set(key, (m = new Map()));
    m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + (t.myShare ?? t.amount));
  }
  const months = [...trailingByMonth.values()];
  const avgByCat = new Map<string, number>();
  for (const cat of categories) {
    const vals = months.map((m) => m.get(cat.id) ?? 0).filter((v) => v > 0);
    if (vals.length >= 2) {
      avgByCat.set(cat.id, vals.reduce((a, b) => a + b, 0) / vals.length);
    }
  }

  const overspend: { cat: Category; spent: number; ratio: number; reason: string }[] = [];
  for (const cat of categories) {
    const spent = thisMonthByCat.get(cat.id)?.total ?? 0;
    if (spent <= 0) continue;
    if (cat.budget && cat.budget > 0) {
      const expected = cat.budget * paceFactor;
      const ratio = spent / expected;
      if (ratio > 1.15) {
        overspend.push({
          cat,
          spent,
          ratio,
          reason: `${inr(spent)} spent vs ${inr(expected)} paced (${inr(cat.budget)} budget)`,
        });
      }
    } else {
      const avg = avgByCat.get(cat.id);
      if (avg && avg > 500) {
        const ratio = spent / (avg * paceFactor);
        if (ratio > 1.3) {
          overspend.push({
            cat,
            spent,
            ratio,
            reason: `${inr(spent)} vs 3-mo avg ${inr(avg * paceFactor)} at this point`,
          });
        }
      }
    }
  }
  overspend.sort((a, b) => b.ratio - a.ratio);
  for (const o of overspend.slice(0, 3)) {
    out.push({
      code: `overspend:${o.cat.id}`,
      tone: "warn",
      title: `${o.cat.name} trending hot — ${Math.round(o.ratio * 100)}% of pace`,
      detail: o.reason,
    });
  }

  // ── 2. Outstanding receivables from shared transactions ───────────────
  let receivable = 0;
  let receivableCount = 0;
  const topFriends = new Map<string, number>();
  for (const t of [...currentMonth, ...trailing]) {
    if (t.type !== "EXPENSE" || t.settledAt || t.myShare == null) continue;
    const owed = t.amount - t.myShare;
    if (owed <= 0) continue;
    receivable += owed;
    receivableCount += 1;
    if (t.splitWith) {
      for (const name of t.splitWith.split(/[,;/]+/).map((s) => s.trim()).filter(Boolean)) {
        topFriends.set(name, (topFriends.get(name) ?? 0) + owed / t.splitWith.split(/[,;/]+/).length);
      }
    }
  }
  if (receivable > 0) {
    const friendList = [...topFriends.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([n]) => n)
      .join(", ");
    out.push({
      code: "receivables",
      tone: "warn",
      title: `${inr(receivable)} outstanding from ${receivableCount} group transaction${receivableCount === 1 ? "" : "s"}`,
      detail: friendList
        ? `Most owed by: ${friendList}. Tap Settle when paid back.`
        : "Tap Settle on each row once your friends pay you back.",
    });
  }

  // ── 3. Subscription drag (annualised) ─────────────────────────────────
  const monthlySubs = currentMonth
    .filter((t) => t.type === "EXPENSE" && t.isRecurring)
    .reduce((a, t) => a + (t.myShare ?? t.amount), 0);
  if (monthlySubs > 0) {
    out.push({
      code: "subscriptions",
      tone: "info",
      title: `Subscriptions: ${inr(monthlySubs)}/mo — ${inr(monthlySubs * 12)}/yr`,
      detail: "Audit recurring spends once a quarter. A ₹499/mo app is ₹5,988 a year.",
    });
  }

  // ── 4. Savings pulse (positive reinforcement) ─────────────────────────
  const income = currentMonth
    .filter((t) => t.type === "CREDIT")
    .reduce((a, t) => a + t.amount, 0);
  const consumption = currentMonth
    .filter((t) => t.type === "EXPENSE" && t.category.type !== "INVESTMENT")
    .reduce((a, t) => a + (t.myShare ?? t.amount), 0);
  if (income > 0) {
    const rate = (income - consumption) / income;
    if (rate >= 0.3) {
      out.push({
        code: "savings-good",
        tone: "good",
        title: `Saving ${Math.round(rate * 100)}% of income this month`,
        detail: "Redirect excess cash to SIPs rather than letting it sit idle.",
      });
    } else if (rate < 0.1 && daysElapsed > 10) {
      out.push({
        code: "savings-low",
        tone: "warn",
        title: `Savings rate at ${Math.round(rate * 100)}% — under the 10% floor`,
        detail: "Check the overspend bullets above. Small daily habits add up fastest.",
      });
    }
  }

  if (out.length === 0) {
    out.push({
      code: "no-insights",
      tone: "info",
      title: "Not enough data yet",
      detail: "Log a few more transactions and insights will appear here automatically.",
    });
  }
  return out;
}

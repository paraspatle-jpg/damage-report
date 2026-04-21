import { prisma } from "@/lib/db";
import { computeInsights, type Insight } from "./insights";

export type MonthSummary = {
  month: string;
  income: number;
  expenses: number;
  investments: number;
  savingsRate: number;
  receivable: number;
  topCategories: { name: string; total: number }[];
};

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function getExpensesView() {
  const now = new Date();
  const thisMonthStart = monthStart(now);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  const [categories, recent, currentMonth, trailing] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.transaction.findMany({
      include: { category: true },
      orderBy: { occurredAt: "desc" },
      take: 30,
    }),
    prisma.transaction.findMany({
      include: { category: true },
      where: { occurredAt: { gte: thisMonthStart } },
    }),
    prisma.transaction.findMany({
      include: { category: true },
      where: { occurredAt: { gte: threeMonthsAgo, lt: thisMonthStart } },
    }),
  ]);

  const income = currentMonth
    .filter((t) => t.type === "CREDIT")
    .reduce((a, t) => a + t.amount, 0);

  const expenses = currentMonth
    .filter((t) => t.type === "EXPENSE" && t.category.type !== "INVESTMENT")
    .reduce((a, t) => a + (t.myShare ?? t.amount), 0);

  const investments = currentMonth
    .filter((t) => t.type === "EXPENSE" && t.category.type === "INVESTMENT")
    .reduce((a, t) => a + (t.myShare ?? t.amount), 0);

  const savingsRate = income > 0 ? (income - expenses) / income : 0;

  const receivable = [...currentMonth, ...trailing]
    .filter((t) => t.type === "EXPENSE" && !t.settledAt && t.myShare != null)
    .reduce((a, t) => a + (t.amount - (t.myShare ?? 0)), 0);

  const catTotals = new Map<string, number>();
  for (const t of currentMonth) {
    if (t.type !== "EXPENSE" || t.category.type === "INVESTMENT") continue;
    catTotals.set(t.category.name, (catTotals.get(t.category.name) ?? 0) + (t.myShare ?? t.amount));
  }
  const topCategories = [...catTotals.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const summary: MonthSummary = {
    month: thisMonthStart.toLocaleString("en-IN", { month: "long", year: "numeric" }),
    income,
    expenses,
    investments,
    savingsRate,
    receivable,
    topCategories,
  };

  const insights: Insight[] = computeInsights({
    monthStart: thisMonthStart,
    now,
    currentMonth,
    trailing,
    categories,
  });

  return { categories, recent, summary, insights };
}

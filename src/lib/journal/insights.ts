import type { JournalEntry } from "@prisma/client";
import type { Quote } from "../market/provider";

export type ReviewedEntry = {
  entry: JournalEntry;
  currentPrice?: number;
  daysSince: number;
  outcomePercent?: number;
  verdict?: "CORRECT" | "REGRETTED" | "NEUTRAL";
  note?: string;
};

export type JournalInsight = {
  code: string;
  title: string;
  detail: string;
  tone: "warn" | "good" | "info";
};

const MS_PER_DAY = 86_400_000;

export function reviewEntries(entries: JournalEntry[], quotes: Map<string, Quote>): ReviewedEntry[] {
  const now = Date.now();
  return entries.map((entry) => {
    const quote = quotes.get(entry.symbol);
    const daysSince = Math.floor((now - entry.createdAt.getTime()) / MS_PER_DAY);
    if (!quote) return { entry, daysSince };

    const currentPrice = quote.price;
    const action = entry.action.toUpperCase();
    const rawReturn = ((currentPrice - entry.price) / entry.price) * 100;
    const outcomePercent = action === "BUY" ? rawReturn : action === "SELL" ? -rawReturn : rawReturn;

    let verdict: ReviewedEntry["verdict"] = "NEUTRAL";
    if (daysSince >= 7) {
      if (outcomePercent >= 2) verdict = "CORRECT";
      else if (outcomePercent <= -2) verdict = "REGRETTED";
    }

    return {
      entry,
      currentPrice,
      daysSince,
      outcomePercent,
      verdict,
      note: buildEntryNote(action, outcomePercent, daysSince),
    };
  });
}

function buildEntryNote(action: string, outcomePercent: number | undefined, days: number): string | undefined {
  if (outcomePercent === undefined || days < 3) return undefined;
  const mag = Math.abs(outcomePercent).toFixed(1);
  if (action === "BUY") {
    return outcomePercent >= 0 ? `Position up ${mag}% since buy.` : `Position down ${mag}% since buy.`;
  }
  if (action === "SELL") {
    return outcomePercent >= 0
      ? `Exit looked right — price is ${mag}% lower since.`
      : `Sold too early — price is ${mag}% higher since.`;
  }
  return undefined;
}

export function summarise(reviewed: ReviewedEntry[]): JournalInsight[] {
  const insights: JournalInsight[] = [];
  const withVerdict = reviewed.filter((r) => r.verdict && r.outcomePercent !== undefined);
  if (withVerdict.length < 3) {
    return [
      {
        code: "NEEDS_DATA",
        title: "Log a few more trades",
        detail: "Insights start appearing after ~3 entries with at least a week of post-decision data.",
        tone: "info",
      },
    ];
  }

  const sells = withVerdict.filter((r) => r.entry.action.toUpperCase() === "SELL");
  const earlySellers = sells.filter((r) => (r.outcomePercent ?? 0) < -3);
  if (sells.length >= 3 && earlySellers.length / sells.length >= 0.5) {
    insights.push({
      code: "SELL_WINNERS_EARLY",
      title: "You tend to sell winners too early",
      detail: `${earlySellers.length} of your last ${sells.length} sells rallied ≥3% after exit. Consider trailing stops instead of hard exits.`,
      tone: "warn",
    });
  }

  const buys = withVerdict.filter((r) => r.entry.action.toUpperCase() === "BUY");
  const averagingDown = averagingDownSignal(reviewed);
  if (averagingDown) {
    insights.push({
      code: "AVERAGE_LOSERS",
      title: "You average down on losers",
      detail: averagingDown,
      tone: "warn",
    });
  }

  const regretted = withVerdict.filter((r) => r.verdict === "REGRETTED");
  if (withVerdict.length >= 5 && regretted.length / withVerdict.length >= 0.6) {
    insights.push({
      code: "HIGH_REGRET",
      title: "Majority of decisions are underwater",
      detail: `${regretted.length}/${withVerdict.length} recent entries aged poorly. Slow down — review your pre-trade checklist.`,
      tone: "warn",
    });
  }

  const correct = withVerdict.filter((r) => r.verdict === "CORRECT");
  if (withVerdict.length >= 5 && correct.length / withVerdict.length >= 0.6) {
    insights.push({
      code: "DISCIPLINE_WORKING",
      title: "Your framework is paying off",
      detail: `${correct.length}/${withVerdict.length} recent decisions aged well. Keep journaling.`,
      tone: "good",
    });
  }

  const emotionCounts = tallyEmotions(buys);
  const fomo = emotionCounts.get("fomo") ?? 0;
  if (fomo >= 2) {
    const fomoBuys = buys.filter((r) => (r.entry.emotion ?? "").toLowerCase() === "fomo");
    const badFomo = fomoBuys.filter((r) => (r.outcomePercent ?? 0) < 0).length;
    if (badFomo / Math.max(1, fomoBuys.length) >= 0.5) {
      insights.push({
        code: "FOMO_BUYS",
        title: "FOMO buys are underperforming",
        detail: `${badFomo}/${fomoBuys.length} trades tagged "fomo" are down. Sit on your hands next time you feel it.`,
        tone: "warn",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      code: "STEADY",
      title: "No strong patterns yet",
      detail: "Decisions look balanced. Keep journaling — patterns appear as the sample grows.",
      tone: "info",
    });
  }

  return insights;
}

function averagingDownSignal(reviewed: ReviewedEntry[]): string | null {
  const bySymbol = new Map<string, ReviewedEntry[]>();
  reviewed.forEach((r) => {
    if (r.entry.action.toUpperCase() !== "BUY") return;
    const list = bySymbol.get(r.entry.symbol) ?? [];
    list.push(r);
    bySymbol.set(r.entry.symbol, list);
  });

  const offenders: string[] = [];
  for (const [symbol, buys] of bySymbol) {
    if (buys.length < 2) continue;
    const sorted = [...buys].sort((a, b) => a.entry.createdAt.getTime() - b.entry.createdAt.getTime());
    let stepDowns = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].entry.price < sorted[i - 1].entry.price * 0.97) stepDowns += 1;
    }
    const latestOutcome = sorted[sorted.length - 1].outcomePercent ?? 0;
    if (stepDowns >= 1 && latestOutcome < 0) offenders.push(symbol);
  }

  if (offenders.length === 0) return null;
  return `Adding to losing positions on ${offenders.slice(0, 3).join(", ")}${offenders.length > 3 ? " and others" : ""}. Set a max-add rule or a hard stop.`;
}

function tallyEmotions(entries: ReviewedEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  entries.forEach((r) => {
    const e = (r.entry.emotion ?? "").toLowerCase().trim();
    if (!e) return;
    counts.set(e, (counts.get(e) ?? 0) + 1);
  });
  return counts;
}

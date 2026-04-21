import { prisma } from "../db";
import { marketProvider } from "../market/yahoo";
import { reviewEntries, summarise, type JournalInsight, type ReviewedEntry } from "./insights";

export async function getJournalView(): Promise<{
  reviewed: ReviewedEntry[];
  insights: JournalInsight[];
}> {
  const entries = await prisma.journalEntry.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  if (entries.length === 0) return { reviewed: [], insights: summarise([]) };

  const symbols = Array.from(new Set(entries.map((e) => e.symbol)));
  const quoteList = await marketProvider.getQuotes(symbols).catch(() => []);
  const quotes = new Map(quoteList.map((q) => [q.symbol, q]));

  const reviewed = reviewEntries(entries, quotes);
  const insights = summarise(reviewed);
  return { reviewed, insights };
}

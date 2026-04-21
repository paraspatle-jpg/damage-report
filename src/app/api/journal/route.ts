import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getJournalView } from "@/lib/journal/service";
import { withAuth } from "@/lib/auth/guards";

export const GET = withAuth(async () => {
  const view = await getJournalView();
  return NextResponse.json({
    insights: view.insights,
    entries: view.reviewed.map((r) => ({
      ...r.entry,
      currentPrice: r.currentPrice,
      daysSince: r.daysSince,
      outcomePercent: r.outcomePercent,
      verdict: r.verdict,
      note: r.note,
    })),
  });
});

const createSchema = z.object({
  symbol: z.string().min(1).transform((s) => s.trim().toUpperCase()),
  action: z.enum(["BUY", "SELL", "HOLD"]),
  reason: z.string().min(1),
  price: z.number().positive(),
  quantity: z.number().positive(),
  emotion: z.string().optional(),
});

export const POST = withAuth(async (req) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const entry = await prisma.journalEntry.create({ data: parsed.data });
  return NextResponse.json({ entry }, { status: 201 });
});

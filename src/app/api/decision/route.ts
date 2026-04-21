import { NextResponse } from "next/server";
import { z } from "zod";
import { marketProvider } from "@/lib/market/yahoo";
import { decide } from "@/lib/decision/engine";
import { withAuth } from "@/lib/auth/guards";

const inputSchema = z.object({
  symbol: z.string().min(1).transform((s) => s.trim().toUpperCase()),
  buyPrice: z.number().positive().optional(),
});

export const POST = withAuth(async (req) => {
  const body = await req.json();
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { symbol, buyPrice } = parsed.data;

  try {
    const [quote, candles] = await Promise.all([
      marketProvider.getQuote(symbol),
      marketProvider.getHistory(symbol, "6mo"),
    ]);
    const decision = decide({
      symbol,
      buyPrice,
      currentPrice: quote.price,
      candles,
    });
    return NextResponse.json({
      decision,
      quote,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Could not analyze ${symbol}: ${(e as Error).message}` },
      { status: 502 },
    );
  }
});

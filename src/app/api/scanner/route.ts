import { NextResponse } from "next/server";
import { z } from "zod";
import { scanBreakouts } from "@/lib/scanner/breakout";
import { withAuth } from "@/lib/auth/guards";

const schema = z.object({
  symbols: z.array(z.string().min(1)).min(1).max(40),
});

export const POST = withAuth(async (req) => {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const result = await scanBreakouts(parsed.data.symbols);
  return NextResponse.json(result);
});

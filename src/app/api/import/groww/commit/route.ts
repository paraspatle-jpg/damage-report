import { NextResponse } from "next/server";
import { z } from "zod";
import { AssetCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth/guards";

const schema = z.object({
  rows: z
    .array(
      z.object({
        symbol: z.string().min(1).transform((s) => s.trim().toUpperCase()),
        name: z.string().optional(),
        quantity: z.number().positive(),
        buyPrice: z.number().positive(),
        category: z.nativeEnum(AssetCategory),
      }),
    )
    .min(1),
  replace: z.boolean().optional(),
});

export const POST = withAuth(async (req) => {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { rows, replace } = parsed.data;

  if (replace) {
    await prisma.$transaction([
      prisma.holding.deleteMany(),
      prisma.holding.createMany({ data: rows }),
    ]);
  } else {
    await prisma.holding.createMany({ data: rows });
  }

  const total = await prisma.holding.count();
  return NextResponse.json({ imported: rows.length, total });
});

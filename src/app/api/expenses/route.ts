import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth/guards";

const createSchema = z.object({
  type: z.enum(["EXPENSE", "CREDIT", "TRANSFER"]),
  amount: z.number().positive(),
  categoryId: z.string().min(1),
  merchant: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  note: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  occurredAt: z.string().min(1),
  isRecurring: z.boolean().optional(),
  myShare: z.number().positive().optional(),
  splitWith: z.string().trim().optional().transform((v) => (v ? v : undefined)),
});

export const POST = withAuth(async (req) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { occurredAt, myShare, ...rest } = parsed.data;
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (myShare != null && myShare > rest.amount) {
    return NextResponse.json({ error: "myShare cannot exceed amount" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { id: rest.categoryId } });
  if (!category) return NextResponse.json({ error: "Unknown category" }, { status: 400 });

  const txn = await prisma.transaction.create({
    data: { ...rest, myShare, occurredAt: date, source: "manual" },
  });
  return NextResponse.json({ txn }, { status: 201 });
});

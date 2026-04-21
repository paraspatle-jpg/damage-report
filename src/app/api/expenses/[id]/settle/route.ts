import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth/guards";

export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const settled = body?.settled !== false;
  const txn = await prisma.transaction.update({
    where: { id },
    data: { settledAt: settled ? new Date() : null },
  });
  return NextResponse.json({ txn });
});

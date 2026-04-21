import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth/guards";

export const DELETE = withAuth<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  await prisma.journalEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

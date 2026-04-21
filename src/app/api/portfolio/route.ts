import { NextResponse } from "next/server";
import { getPortfolioSnapshot } from "@/lib/portfolio/service";
import { withAuth } from "@/lib/auth/guards";

export const GET = withAuth(async () => {
  try {
    const snapshot = await getPortfolioSnapshot();
    return NextResponse.json(snapshot);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

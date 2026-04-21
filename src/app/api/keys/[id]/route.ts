import { NextResponse } from "next/server";
import { withAuth, getAuthedUser } from "@/lib/auth/guards";
import { revokeApiKey } from "@/lib/auth/api-key";

export const DELETE = withAuth<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.via !== "jwt") {
    return NextResponse.json({ error: "API keys cannot revoke API keys" }, { status: 403 });
  }
  const { id } = await params;
  const ok = await revokeApiKey(id, user.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
});

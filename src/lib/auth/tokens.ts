import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { REFRESH_TOKEN_TTL_SECONDS } from "./config";

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = randomToken();
  const tokenHash = sha256Hex(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  return raw;
}

export type RefreshResult =
  | { ok: true; userId: string; newRaw: string }
  | { ok: false; reason: "not_found" | "expired" | "used" | "revoked" };

export async function rotateRefreshToken(raw: string): Promise<RefreshResult> {
  const tokenHash = sha256Hex(raw);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (existing.usedAt) {
    // Replay detected — nuke all sessions for this user.
    await prisma.refreshToken.deleteMany({ where: { userId: existing.userId } });
    return { ok: false, reason: "used" };
  }

  const newRaw = randomToken();
  const newHash = sha256Hex(newRaw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await prisma.$transaction([
    prisma.refreshToken.create({ data: { userId: existing.userId, tokenHash: newHash, expiresAt } }),
    prisma.refreshToken.update({
      where: { id: existing.id },
      data: { usedAt: new Date(), replacedBy: newHash },
    }),
  ]);

  return { ok: true, userId: existing.userId, newRaw };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  const tokenHash = sha256Hex(raw);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

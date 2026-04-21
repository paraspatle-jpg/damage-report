import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { sha256Hex } from "./tokens";

const PREFIX = "iv_";

export function generateApiKeyRaw(): string {
  return PREFIX + crypto.randomBytes(24).toString("hex");
}

export async function createApiKey(userId: string, name: string) {
  const raw = generateApiKeyRaw();
  const keyHash = sha256Hex(raw);
  const keyPrefix = raw.slice(0, 10);
  const row = await prisma.apiKey.create({
    data: { userId, name, keyHash, keyPrefix },
  });
  return { raw, key: row };
}

export async function verifyApiKey(raw: string): Promise<{ userId: string; keyId: string } | null> {
  if (!raw || !raw.startsWith(PREFIX)) return null;
  const keyHash = sha256Hex(raw);
  const row = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!row || row.revokedAt) return null;
  await prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { userId: row.userId, keyId: row.id };
}

export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
  const res = await prisma.apiKey.updateMany({
    where: { id: keyId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return res.count > 0;
}

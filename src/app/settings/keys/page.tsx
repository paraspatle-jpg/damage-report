import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { ACCESS_COOKIE } from "@/lib/auth/config";
import { KeysClient } from "./KeysClient";

export const dynamic = "force-dynamic";

async function currentUserId(): Promise<string | null> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  const payload = await verifyAccessToken(access);
  return payload?.sub ?? null;
}

export default async function ApiKeysPage() {
  const userId = await currentUserId();
  const keys = userId
    ? await prisma.apiKey.findMany({
        where: { userId },
        orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          lastUsedAt: true,
          revokedAt: true,
          createdAt: true,
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">API keys</h1>
        <p className="text-sm text-fgMuted">
          For machine-to-machine access (Telegram bot, scripts, cron). Send as{" "}
          <code className="rounded bg-surfaceMuted px-1 py-0.5 text-xs">Authorization: Bearer &lt;key&gt;</code>.
          For Telegram, paste the key as <code className="rounded bg-surfaceMuted px-1 py-0.5 text-xs">secret_token</code> on{" "}
          <code className="rounded bg-surfaceMuted px-1 py-0.5 text-xs">setWebhook</code>.
        </p>
      </div>
      <KeysClient initialKeys={keys.map((k) => ({
        ...k,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        revokedAt: k.revokedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      }))} />
    </div>
  );
}

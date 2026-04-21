"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type KeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KeysClient({ initialKeys }: { initialKeys: KeyRow[] }) {
  const router = useRouter();
  const [keys, setKeys] = useState<KeyRow[]>(initialKeys);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<{ name: string; raw: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setCreating(false);
    if (!res.ok) {
      setError("Failed to create key.");
      return;
    }
    const data = await res.json();
    setFreshKey({ name: data.key.name, raw: data.raw });
    setKeys((xs) => [
      {
        id: data.key.id,
        name: data.key.name,
        keyPrefix: data.key.keyPrefix,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: data.key.createdAt,
      },
      ...xs,
    ]);
    setName("");
  }

  function onRevoke(id: string) {
    if (!confirm("Revoke this key? Any bot or script using it will stop working immediately.")) return;
    start(async () => {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setKeys((xs) => xs.map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k)));
      router.refresh();
    });
  }

  async function copyFreshKey() {
    if (!freshKey) return;
    await navigator.clipboard.writeText(freshKey.raw).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-3 font-semibold">Create a new key</h2>
        <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="label">Name</label>
            <input
              className="input"
              placeholder="e.g. Telegram bot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <button className="btn" disabled={creating}>
            {creating ? "Creating…" : "Create key"}
          </button>
        </form>
        {error && <div className="mt-2 text-sm text-danger">{error}</div>}
      </div>

      {freshKey && (
        <div className="card" style={{ borderColor: "rgb(var(--accent))" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{freshKey.name}</h2>
              <p className="mt-1 text-xs text-fgMuted">
                Save this now — it won&apos;t be shown again.
              </p>
            </div>
            <button
              onClick={copyFreshKey}
              className="pill bg-accent/10 text-accent hover:bg-accent/20"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-surfaceMuted p-3 font-mono text-sm break-all whitespace-pre-wrap">
{freshKey.raw}
          </pre>
          <button
            className="mt-3 text-xs text-fgMuted hover:text-fg"
            onClick={() => setFreshKey(null)}
          >
            I saved it, dismiss →
          </button>
        </div>
      )}

      <div className="card">
        <h2 className="mb-3 font-semibold">Existing keys</h2>
        {keys.length === 0 ? (
          <div className="text-sm text-fgMuted">No keys yet.</div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-fg/[.08] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{k.name}</span>
                    {k.revokedAt ? (
                      <span className="pill bg-danger/10 text-danger">revoked</span>
                    ) : (
                      <span className="pill bg-accent/10 text-accent">active</span>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-xs text-fgMuted">{k.keyPrefix}…</div>
                  <div className="text-xs text-fgMuted">
                    Created {formatDate(k.createdAt)} · Last used {formatDate(k.lastUsedAt)}
                    {k.revokedAt && <> · Revoked {formatDate(k.revokedAt)}</>}
                  </div>
                </div>
                {!k.revokedAt && (
                  <button
                    className="text-xs text-fgMuted/80 hover:text-danger"
                    disabled={pending}
                    onClick={() => onRevoke(k.id)}
                  >
                    {pending ? "…" : "Revoke"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

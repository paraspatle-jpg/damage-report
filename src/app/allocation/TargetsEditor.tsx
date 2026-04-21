"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Row = { category: string; targetPercent: number };

const CATEGORIES = ["INDEX_ETF", "SECTOR_ETF", "STOCK", "COMMODITY", "BOND", "CASH"] as const;

export function TargetsEditor({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(() => {
    const seed = new Map(initial.map((r) => [r.category, r.targetPercent]));
    return CATEGORIES.map((c) => ({ category: c, targetPercent: seed.get(c) ?? 0 }));
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const sum = useMemo(() => rows.reduce((a, r) => a + (Number.isFinite(r.targetPercent) ? r.targetPercent : 0), 0), [rows]);

  async function save() {
    setSaving(true);
    setMsg(null);
    const payload = {
      targets: rows.filter((r) => r.targetPercent > 0),
    };
    const res = await fetch("/api/allocation", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMsg(body.error ?? "Save failed");
      return;
    }
    setMsg("Saved.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.category} className="flex items-center gap-2">
          <div className="flex-1 text-sm">{labelFor(r.category)}</div>
          <input
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={r.targetPercent}
            onChange={(e) => {
              const value = Number(e.target.value);
              setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, targetPercent: value } : row)));
            }}
            className="input w-24"
          />
          <div className="w-4 text-xs text-fgMuted">%</div>
        </div>
      ))}
      <div className="flex items-center justify-between text-sm">
        <span className="text-fgMuted">Sum</span>
        <span className={`tabular-nums font-medium ${Math.abs(sum - 100) < 0.5 ? "text-accent" : "text-danger"}`}>
          {sum.toFixed(1)}%
        </span>
      </div>
      <button className="btn w-full" disabled={saving || Math.abs(sum - 100) >= 0.5} onClick={save}>
        {saving ? "Saving…" : "Save targets"}
      </button>
      {msg && <div className="text-xs text-fgMuted">{msg}</div>}
    </div>
  );
}

function labelFor(c: string) {
  return c
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

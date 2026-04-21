"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CATEGORIES = [
  { value: "INDEX_ETF", label: "Index ETF" },
  { value: "SECTOR_ETF", label: "Sector ETF" },
  { value: "COMMODITY", label: "Commodity" },
  { value: "STOCK", label: "Stock" },
  { value: "BOND", label: "Bond" },
];

export function AddSipForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      symbol: String(form.get("symbol") ?? "").trim(),
      label: String(form.get("label") ?? "").trim(),
      baseAmount: Number(form.get("baseAmount")),
      category: String(form.get("category") ?? "INDEX_ETF"),
    };
    const res = await fetch("/api/sip", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Failed to add plan.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label">Label</label>
        <input name="label" required className="input" placeholder="Nifty core SIP" />
      </div>
      <div>
        <label className="label">Symbol (Yahoo)</label>
        <input name="symbol" required className="input" placeholder="NIFTYBEES.NS" />
      </div>
      <div>
        <label className="label">Category</label>
        <select name="category" className="input" defaultValue="INDEX_ETF">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Base amount (₹ / month)</label>
        <input name="baseAmount" type="number" step="100" required className="input" placeholder="10000" />
      </div>
      <button className="btn w-full" disabled={loading}>
        {loading ? "Adding…" : "Add plan"}
      </button>
      {error && <div className="text-sm text-danger">{error}</div>}
    </form>
  );
}

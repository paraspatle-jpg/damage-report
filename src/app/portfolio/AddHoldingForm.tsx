"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const categories = [
  { value: "INDEX_ETF", label: "Index ETF" },
  { value: "SECTOR_ETF", label: "Sector ETF" },
  { value: "STOCK", label: "Stock" },
  { value: "COMMODITY", label: "Commodity" },
  { value: "BOND", label: "Bond" },
  { value: "CASH", label: "Cash" },
];

export function AddHoldingForm() {
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
      name: String(form.get("name") ?? "").trim() || undefined,
      category: String(form.get("category") ?? "INDEX_ETF"),
      quantity: Number(form.get("quantity")),
      buyPrice: Number(form.get("buyPrice")),
    };
    const res = await fetch("/api/holdings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Failed to add. Check inputs.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label">Symbol (Yahoo format, e.g. NIFTYBEES.NS)</label>
        <input name="symbol" required className="input" placeholder="HFCL.NS" />
      </div>
      <div>
        <label className="label">Name (optional)</label>
        <input name="name" className="input" placeholder="HFCL Ltd" />
      </div>
      <div>
        <label className="label">Category</label>
        <select name="category" className="input" defaultValue="STOCK">
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Quantity</label>
          <input name="quantity" type="number" step="0.01" required className="input" />
        </div>
        <div>
          <label className="label">Avg buy (₹)</label>
          <input name="buyPrice" type="number" step="0.01" required className="input" />
        </div>
      </div>
      <button className="btn w-full" disabled={loading}>
        {loading ? "Adding…" : "Add holding"}
      </button>
      {error && <div className="text-sm text-danger">{error}</div>}
    </form>
  );
}

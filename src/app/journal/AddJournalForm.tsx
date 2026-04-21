"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddJournalForm() {
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
      action: String(form.get("action") ?? "BUY"),
      reason: String(form.get("reason") ?? "").trim(),
      price: Number(form.get("price")),
      quantity: Number(form.get("quantity")),
      emotion: String(form.get("emotion") ?? "").trim() || undefined,
    };
    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Failed to save entry.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label">Symbol</label>
        <input name="symbol" required className="input" placeholder="HFCL.NS" />
      </div>
      <div>
        <label className="label">Action</label>
        <select name="action" className="input" defaultValue="BUY">
          <option value="BUY">Buy</option>
          <option value="SELL">Sell</option>
          <option value="HOLD">Hold</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Price (₹)</label>
          <input name="price" type="number" step="0.01" required className="input" />
        </div>
        <div>
          <label className="label">Quantity</label>
          <input name="quantity" type="number" step="0.01" required className="input" />
        </div>
      </div>
      <div>
        <label className="label">Reason</label>
        <textarea name="reason" required rows={3} className="input" placeholder="Breakout above 20-day high, volume confirms." />
      </div>
      <div>
        <label className="label">Emotion (optional)</label>
        <input name="emotion" className="input" placeholder="e.g. fomo, confident, anxious" />
      </div>
      <button className="btn w-full" disabled={loading}>
        {loading ? "Saving…" : "Log entry"}
      </button>
      {error && <div className="text-sm text-danger">{error}</div>}
    </form>
  );
}

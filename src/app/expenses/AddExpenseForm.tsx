"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Category = {
  id: string;
  name: string;
  type: "NEED" | "WANT" | "INVESTMENT" | "INCOME";
};

type TxnType = "EXPENSE" | "CREDIT" | "TRANSFER";

function todayIsoDate(): string {
  const now = new Date();
  const tz = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - tz).toISOString().slice(0, 10);
}

export function AddExpenseForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<TxnType>("EXPENSE");
  const [isShared, setIsShared] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [myShare, setMyShare] = useState<string>("");

  const visibleCategories = useMemo(() => {
    if (type === "CREDIT") return categories.filter((c) => c.type === "INCOME");
    if (type === "EXPENSE") return categories.filter((c) => c.type !== "INCOME");
    return categories;
  }, [categories, type]);

  const owed =
    isShared && Number(amount) > 0 && Number(myShare) > 0 && Number(myShare) <= Number(amount)
      ? Number(amount) - Number(myShare)
      : 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      type,
      amount: Number(form.get("amount")),
      categoryId: String(form.get("categoryId") ?? ""),
      merchant: String(form.get("merchant") ?? "").trim() || undefined,
      note: String(form.get("note") ?? "").trim() || undefined,
      occurredAt: String(form.get("occurredAt") ?? ""),
      isRecurring: form.get("isRecurring") === "on",
    };
    if (isShared && type === "EXPENSE") {
      const ms = Number(form.get("myShare"));
      const sw = String(form.get("splitWith") ?? "").trim();
      if (ms > 0) payload.myShare = ms;
      if (sw) payload.splitWith = sw;
    }
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Failed to save transaction.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    setType("EXPENSE");
    setIsShared(false);
    setAmount("");
    setMyShare("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label">Type</label>
        <select
          name="type"
          className="input"
          value={type}
          onChange={(e) => {
            setType(e.target.value as TxnType);
            if (e.target.value !== "EXPENSE") setIsShared(false);
          }}
        >
          <option value="EXPENSE">Expense</option>
          <option value="CREDIT">Credit (income)</option>
          <option value="TRANSFER">Transfer</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Amount (₹)</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            required
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Date</label>
          <input name="occurredAt" type="date" required defaultValue={todayIsoDate()} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Category</label>
        <select name="categoryId" required className="input" defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          {visibleCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.type.toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Merchant (optional)</label>
        <input name="merchant" className="input" placeholder="Swiggy, BigBasket, HDFC EMI" />
      </div>
      <div>
        <label className="label">Note (optional)</label>
        <input name="note" className="input" placeholder="Dinner with family" />
      </div>
      <label className="flex items-center gap-2 text-sm text-fg/80">
        <input name="isRecurring" type="checkbox" /> Recurring
      </label>

      {type === "EXPENSE" && (
        <div className="rounded-xl border border-fg/[.08] p-3">
          <label className="flex items-center gap-2 text-sm text-fg/80">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
            />
            Split with friends
          </label>
          {isShared && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="label">Your share (₹)</label>
                <input
                  name="myShare"
                  type="number"
                  step="0.01"
                  className="input"
                  value={myShare}
                  onChange={(e) => setMyShare(e.target.value)}
                  placeholder="How much is actually yours"
                />
              </div>
              <div>
                <label className="label">Split with</label>
                <input
                  name="splitWith"
                  className="input"
                  placeholder="Rohan, Priya, Aman"
                />
              </div>
              {owed > 0 && (
                <div className="rounded-lg bg-warn/10 px-3 py-2 text-xs text-warn">
                  ₹{owed.toLocaleString("en-IN")} will be tracked as owed to you.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button className="btn w-full" disabled={loading}>
        {loading ? "Saving…" : "Add transaction"}
      </button>
      {error && <div className="text-sm text-danger">{error}</div>}
    </form>
  );
}

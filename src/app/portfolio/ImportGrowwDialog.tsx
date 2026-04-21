"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { GrowwPreviewRow, ParseResult } from "@/lib/import/groww";

const CATEGORIES = [
  { value: "INDEX_ETF", label: "Index ETF" },
  { value: "SECTOR_ETF", label: "Sector ETF" },
  { value: "STOCK", label: "Stock" },
  { value: "COMMODITY", label: "Commodity" },
  { value: "BOND", label: "Bond" },
  { value: "CASH", label: "Cash" },
];

type Step = "idle" | "uploading" | "review" | "committing";

export function ImportGrowwDialog() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [rows, setRows] = useState<GrowwPreviewRow[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function reset() {
    setStep("idle");
    setPreview(null);
    setRows([]);
    setError(null);
    setMessage(null);
    setReplaceExisting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    reset();
    setOpen(false);
  }

  async function onFilePick(file: File) {
    setStep("uploading");
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/import/groww", { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to parse file.");
      setStep("idle");
      return;
    }
    const data: ParseResult = await res.json();
    setPreview(data);
    setRows(data.rows);
    setStep("review");
  }

  async function commit() {
    const clean = rows.filter((r) => r.include && r.symbol && r.quantity > 0 && r.buyPrice > 0);
    if (clean.length === 0) {
      setError("Nothing to import. Fix the flagged rows or uncheck blocked ones.");
      return;
    }
    setStep("committing");
    setError(null);
    const res = await fetch("/api/import/groww/commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        replace: replaceExisting,
        rows: clean.map((r) => ({
          symbol: r.symbol,
          name: r.name,
          quantity: r.quantity,
          buyPrice: r.buyPrice,
          category: r.category,
        })),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "Import failed.");
      setStep("review");
      return;
    }
    const body = await res.json();
    setMessage(`Imported ${body.imported} holdings. Portfolio now has ${body.total}.`);
    setStep("idle");
    router.refresh();
    setTimeout(close, 1200);
  }

  return (
    <>
      <button className="btn-outline" onClick={() => setOpen(true)}>
        Import from Groww
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-fg/40 px-4 py-10 backdrop-blur-sm animate-scale-in"
          onClick={close}
        >
          <div
            className="card w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">Import from Groww</h2>
                <p className="text-xs text-fgMuted">
                  Upload the Stocks holdings CSV exported from Groww. We&apos;ll map symbols, detect categories, and let you review before saving.
                </p>
              </div>
              <button className="text-fgMuted hover:text-fg" onClick={close} aria-label="Close">
                ✕
              </button>
            </div>

            {step !== "review" && step !== "committing" && (
              <div className="mt-4 space-y-3">
                <label className="label">CSV file</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="input"
                  disabled={step !== "idle"}
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) onFilePick(file);
                  }}
                />
                <div className="text-xs text-fgMuted">
                  Groww → Investments → Holdings → Download CSV. Only stocks/ETFs supported right now (not mutual funds).
                </div>
                {step === "uploading" && <div className="text-sm text-fgMuted">Parsing…</div>}
                {error && <div className="text-sm text-danger">{error}</div>}
                {message && <div className="text-sm text-accent">{message}</div>}
              </div>
            )}

            {(step === "review" || step === "committing") && preview && (
              <div className="mt-4 space-y-4">
                <DetectionSummary preview={preview} rows={rows} />

                <div className="max-h-[420px] overflow-auto rounded-xl border border-fg/[.08]">
                  <table className="clean">
                    <thead className="sticky top-0">
                      <tr>
                        <th className="w-8"></th>
                        <th>Name</th>
                        <th>Yahoo symbol</th>
                        <th>Category</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Avg price</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => {
                        const blocked = !r.symbol || r.quantity <= 0 || r.buyPrice <= 0;
                        return (
                          <tr key={idx} className={blocked ? "bg-danger/5" : ""}>
                            <td>
                              <input
                                type="checkbox"
                                checked={r.include && !blocked}
                                disabled={blocked}
                                onChange={(e) => updateRow(idx, { include: e.currentTarget.checked })}
                              />
                            </td>
                            <td className="text-xs">{r.name || "—"}</td>
                            <td>
                              <input
                                className="input h-8 py-1 text-xs"
                                value={r.symbol}
                                onChange={(e) => updateRow(idx, { symbol: e.currentTarget.value.toUpperCase() })}
                                placeholder="HFCL.NS"
                              />
                            </td>
                            <td>
                              <select
                                className="input h-8 py-1 text-xs"
                                value={r.category}
                                onChange={(e) => updateRow(idx, { category: e.currentTarget.value as GrowwPreviewRow["category"] })}
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c.value} value={c.value}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="text-right">
                              <input
                                type="number"
                                step="0.01"
                                className="input h-8 w-24 py-1 text-right text-xs"
                                value={r.quantity}
                                onChange={(e) => updateRow(idx, { quantity: Number(e.currentTarget.value) })}
                              />
                            </td>
                            <td className="text-right">
                              <input
                                type="number"
                                step="0.01"
                                className="input h-8 w-28 py-1 text-right text-xs"
                                value={r.buyPrice}
                                onChange={(e) => updateRow(idx, { buyPrice: Number(e.currentTarget.value) })}
                              />
                            </td>
                            <td>
                              {blocked ? (
                                <span className="pill bg-danger/10 text-danger">Needs fix</span>
                              ) : (
                                <span className="pill bg-accent/10 text-accent">Ready</span>
                              )}
                              {r.error && <div className="text-xs text-fgMuted">{r.error}</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.currentTarget.checked)}
                  />
                  Replace existing holdings (wipe then insert). Leave unchecked to append.
                </label>

                {error && <div className="text-sm text-danger">{error}</div>}

                <div className="flex items-center justify-end gap-2">
                  <button className="btn-outline" onClick={reset} disabled={step === "committing"}>
                    Start over
                  </button>
                  <button className="btn" onClick={commit} disabled={step === "committing"}>
                    {step === "committing" ? "Importing…" : `Import ${rows.filter((r) => r.include).length} holdings`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  function updateRow(idx: number, patch: Partial<GrowwPreviewRow>) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, ...patch };
        if (patch.quantity !== undefined || patch.buyPrice !== undefined || patch.symbol !== undefined) {
          const ok = !!next.symbol && next.quantity > 0 && next.buyPrice > 0;
          if (ok) next.include = true;
          next.error = ok ? undefined : next.error;
        }
        return next;
      }),
    );
  }
}

function DetectionSummary({ preview, rows }: { preview: ParseResult; rows: GrowwPreviewRow[] }) {
  const ready = rows.filter((r) => r.symbol && r.quantity > 0 && r.buyPrice > 0).length;
  const needs = rows.length - ready;
  const d = preview.detectedColumns;
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl bg-surfaceMuted p-3 text-xs md:grid-cols-4">
      <Field label="Rows parsed" value={`${rows.length} (${preview.skippedRows} skipped)`} />
      <Field label="Ready" value={String(ready)} tone={ready > 0 ? "good" : undefined} />
      <Field label="Need review" value={String(needs)} tone={needs > 0 ? "warn" : undefined} />
      <Field
        label="Detected columns"
        value={
          [d.name && "Name", d.symbol && "Symbol", d.quantity && "Qty", d.avgPrice && "Avg price"]
            .filter(Boolean)
            .join(" · ") || "—"
        }
      />
    </div>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  const color = tone === "good" ? "text-accent" : tone === "warn" ? "text-warn" : "text-fg";
  return (
    <div>
      <div className="uppercase tracking-wide text-fgMuted">{label}</div>
      <div className={`mt-0.5 font-medium ${color}`}>{value}</div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function SettleButton({ id, settled }: { id: string; settled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className={`pill ${settled ? "bg-accent/10 text-accent" : "bg-warn/10 text-warn hover:bg-warn/20"}`}
      disabled={pending}
      onClick={() => {
        start(async () => {
          await fetch(`/api/expenses/${id}/settle`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ settled: !settled }),
          });
          router.refresh();
        });
      }}
      title={settled ? "Mark unsettled" : "Mark as paid back"}
    >
      {pending ? "…" : settled ? "Settled" : "Settle"}
    </button>
  );
}

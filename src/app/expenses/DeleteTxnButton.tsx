"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function DeleteTxnButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="text-xs text-fgMuted/70 hover:text-danger"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this transaction?")) return;
        start(async () => {
          await fetch(`/api/expenses/${id}`, { method: "DELETE" });
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

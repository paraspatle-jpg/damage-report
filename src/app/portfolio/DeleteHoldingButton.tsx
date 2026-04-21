"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function DeleteHoldingButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="text-xs text-fgMuted hover:text-danger"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this holding?")) return;
        start(async () => {
          await fetch(`/api/holdings/${id}`, { method: "DELETE" });
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}

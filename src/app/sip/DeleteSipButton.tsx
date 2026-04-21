"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function DeleteSipButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="text-xs text-fgMuted hover:text-danger"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this SIP plan?")) return;
        start(async () => {
          await fetch(`/api/sip/${id}`, { method: "DELETE" });
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}

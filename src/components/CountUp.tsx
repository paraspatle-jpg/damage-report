"use client";

import { useEffect, useRef, useState } from "react";
import { formatInr, formatNumber, formatPercent } from "@/lib/format";

type FormatKind = "inr" | "percent" | "number";

const FORMATTERS: Record<FormatKind, (n: number) => string> = {
  inr: formatInr,
  percent: (n) => formatPercent(n),
  number: (n) => formatNumber(n),
};

type Props = {
  value: number;
  format: FormatKind;
  duration?: number;
  className?: string;
};

export function CountUp({ value, format, duration = 900, className }: Props) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = previous.current;
    const end = value;
    if (start === end) return;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = start + (end - start) * eased;
      setDisplay(current);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else previous.current = end;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const fmt = FORMATTERS[format];
  return <span className={className}>{fmt(display)}</span>;
}

import { formatPercent } from "@/lib/format";

export function PnlPill({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={`pill transition-transform hover:scale-105 ${
        positive ? "bg-accent/10 text-accent" : "bg-danger/10 text-danger"
      }`}
    >
      {formatPercent(value)}
    </span>
  );
}

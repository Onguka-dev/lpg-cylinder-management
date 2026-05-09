import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type TrendDirection = "up" | "down" | "flat";

export function TrendChip({
  value,
  direction = "flat",
  label,
  className
}: {
  value: string;
  direction?: TrendDirection;
  label?: string;
  className?: string;
}) {
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const tone =
    direction === "up"
      ? "bg-success-50 text-success-700"
      : direction === "down"
        ? "bg-danger-50 text-danger-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold", tone, className)}>
      <Icon size={13} aria-hidden="true" />
      {value}
      {label ? <span className="font-medium opacity-80">{label}</span> : null}
    </span>
  );
}

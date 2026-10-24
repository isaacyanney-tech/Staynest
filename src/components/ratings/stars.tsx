import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/** Read-only stars filled to an average (for example 4.3). The number is given as text too. */
export function Stars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (filled: boolean) => (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} style={{ width: size, height: size }} fill={filled ? "currentColor" : "none"} strokeWidth={1.6} aria-hidden />
      ))}
    </span>
  );
  return (
    <span className={cn("relative inline-flex shrink-0", className)} aria-hidden>
      <span className="text-star-idle">{row(false)}</span>
      <span className="absolute inset-y-0 left-0 overflow-hidden text-star" style={{ width: `${pct}%` }}>
        {row(true)}
      </span>
    </span>
  );
}

export const formatAverage = (n: number) => n.toFixed(1);

/** "4.3 · 12 ratings" with stars, used on cards and headers. */
export function RatingBadge({ average, count, className }: { average: number; count: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <Stars value={average} size={14} />
      <span className="font-medium text-ink">{formatAverage(average)}</span>
      <span className="text-muted">
        ({count}
        <span className="sr-only"> {count === 1 ? "rating" : "ratings"}, average {formatAverage(average)} out of 5</span>)
      </span>
    </span>
  );
}

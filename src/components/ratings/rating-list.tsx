import type { PublicRating } from "@/lib/hostels/ratings";
import { formatDate } from "@/lib/format";
import { Stars } from "./stars";

export function RatingList({ items }: { items: PublicRating[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((r) => (
        <li key={r.id} className="py-5 first:pt-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stars value={r.stars} size={15} />
            <span className="sr-only">{r.stars} out of 5 stars.</span>
            <span className="text-sm font-medium text-ink">{r.reviewer}</span>
            <span className="text-sm text-muted">{formatDate(r.createdAt)}</span>
          </div>
          {r.comment && <p className="mt-2 whitespace-pre-line leading-relaxed text-ink/90">{r.comment}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Bars showing how many ratings gave each number of stars. */
export function RatingBreakdown({ breakdown }: { breakdown: number[] }) {
  const total = breakdown.reduce((a, b) => a + b, 0) || 1;
  return (
    <ul className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((n) => {
        const count = breakdown[n - 1] ?? 0;
        return (
          <li key={n} className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-2 text-sm">
            <span className="text-muted">{n} {n === 1 ? "star" : "stars"}</span>
            <span className="h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
              <span className="rating-bar block h-full rounded-full bg-star" style={{ width: `${(count / total) * 100}%` }} />
            </span>
            <span className="text-right tabular-nums text-muted">{count}</span>
          </li>
        );
      })}
    </ul>
  );
}

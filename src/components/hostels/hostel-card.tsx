import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import type { HostelCard as Card } from "@/lib/hostels/queries";
import { formatDistance, formatMoney, GENDER_LABEL, PERIOD_SHORT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "./safe-image";

export function HostelCard({ hostel, priority = false }: { hostel: Card; priority?: boolean }) {
  const distance = formatDistance(hostel.distanceKm);
  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sunken">
        {hostel.cover ? (
          <SafeImage
            src={hostel.cover.url}
            alt={hostel.cover.alt}
            fill
            sizes="(min-width: 1280px) 400px, (min-width: 768px) 45vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-ink/70">No photos yet</div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {hostel.demo && <Badge tone="demo" className="bg-warning-soft/95">Illustrative</Badge>}
          {hostel.verified && (
            <Badge tone="verified" className="bg-surface/95" icon={<BadgeCheck className="size-3.5" aria-hidden />}>
              Verified
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em]">
            <Link href={`/hostels/${hostel.slug}`} className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none group-has-[:focus-visible]:underline">
              {hostel.name}
            </Link>
          </h3>
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {[hostel.area, hostel.university?.shortName].filter(Boolean).join(" · ")}
            {distance && ` · ${distance}`}
          </span>
        </p>
        <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
          <p>
            <span className="text-xs text-muted">From </span>
            <span className="font-display text-lg font-semibold tracking-tight text-primary">{formatMoney(hostel.priceFrom)}</span>
            {hostel.pricePeriod && <span className="text-xs text-muted"> {PERIOD_SHORT[hostel.pricePeriod]}</span>}
          </p>
          <p className="text-right text-xs leading-tight text-muted">
            {GENDER_LABEL[hostel.gender]}
            <br />
            {hostel.roomsAvailable > 0 ? (
              <span className="font-medium text-secondary-ink">{hostel.roomsAvailable} rooms open</span>
            ) : (
              <span>Fully booked</span>
            )}
          </p>
        </div>
      </div>
    </article>
  );
}

export function HostelCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton aspect-[4/3] rounded-lg" />
      <div className="skeleton mt-4 h-5 w-3/4 rounded" />
      <div className="skeleton mt-2 h-4 w-1/2 rounded" />
      <div className="skeleton mt-5 h-6 w-1/3 rounded" />
    </div>
  );
}

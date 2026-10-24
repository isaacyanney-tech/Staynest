import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck, BedDouble, Check, ChevronLeft, Info, MapPin, Phone, Users } from "lucide-react";
import { getHostelBySlug, type HostelDetail } from "@/lib/hostels/queries";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { amenityLabel, formatDate, formatDistance, formatMoney, GENDER_LABEL, PERIOD_LABEL } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Notice, Skeleton } from "@/components/ui/states";
import { RichText } from "@/components/cms/rich-text";
import { Gallery } from "@/components/hostels/gallery";
import { InspectionForm } from "@/components/hostels/inspection-form";
import { SaveButton } from "@/components/hostels/save-button";
import { getHostelRatings, getRatingEligibility } from "@/lib/hostels/ratings";
import { RatingBadge, Stars, formatAverage } from "@/components/ratings/stars";
import { RatingBreakdown, RatingList } from "@/components/ratings/rating-list";
import { RatingForm } from "@/components/ratings/rating-form";

export async function generateMetadata({ params }: PageProps<"/hostels/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const hostel = await getHostelBySlug(slug);
  if (!hostel) return { title: "Hostel not found" };
  return {
    title: hostel.name,
    description: hostel.summary || `${hostel.name} in ${hostel.area}, ${hostel.city}.`,
    robots: hostel.demo ? { index: false } : undefined,
    openGraph: hostel.cover ? { images: [{ url: hostel.cover.url, alt: hostel.cover.alt }] } : undefined,
  };
}

export default async function HostelPage({ params }: PageProps<"/hostels/[slug]">) {
  const { slug } = await params;
  const hostel = await getHostelBySlug(slug);
  if (!hostel) notFound();
  const distance = formatDistance(hostel.distanceKm);

  return (
    <article className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6">
      <Link href="/hostels" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-brand">
        <ChevronLeft className="size-4" aria-hidden />
        All hostels
      </Link>

      {hostel.demo && (
        <Notice tone="warning" title="Illustrative listing" className="mt-4">
          This is a sample that shows how StayNest listings look. It is not a real hostel, and the photos are stock images used under the Unsplash License.
        </Notice>
      )}

      <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {hostel.verified && (
              <Badge tone="verified" icon={<BadgeCheck className="size-3.5" aria-hidden />}>
                Verified by StayNest
              </Badge>
            )}
            <Badge>{GENDER_LABEL[hostel.gender]}</Badge>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand md:text-[2.5rem] md:leading-tight">{hostel.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-muted">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {[hostel.address || hostel.area, hostel.city].filter(Boolean).join(", ")}
            {hostel.university && (
              <>
                <span aria-hidden>·</span>
                <span>{distance ? distance.replace("campus", hostel.university.shortName) : `Near ${hostel.university.shortName}`}</span>
              </>
            )}
          </p>
          {hostel.rating && (
            <a href="#ratings-heading" className="mt-2 inline-flex rounded-md hover:underline">
              <RatingBadge average={hostel.rating.average} count={hostel.rating.count} />
            </a>
          )}
        </div>
        <Suspense fallback={<Skeleton className="h-10 w-24" />}>
          <SaveSlot hostelId={hostel.id} slug={hostel.slug} />
        </Suspense>
      </header>

      <div className="mt-6">
        <Gallery photos={hostel.photos} name={hostel.name} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <div className="min-w-0 space-y-12">
          {hostel.summary && <p className="text-lg leading-relaxed text-ink/90">{hostel.summary}</p>}

          <section aria-labelledby="rooms-heading">
            <h2 id="rooms-heading" className="text-2xl font-semibold">
              Rooms and prices
            </h2>
            {hostel.rooms.length === 0 ? (
              <p className="mt-3 text-muted">The owner has not added room prices yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {hostel.rooms.map((room) => (
                  <li key={room.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
                    <div>
                      <h3 className="font-sans text-base font-semibold tracking-normal">{room.name}</h3>
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="size-4" aria-hidden />
                          {room.occupancy === 1 ? "Single occupancy" : `${room.occupancy} people per room`}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <BedDouble className="size-4" aria-hidden />
                          {room.available > 0 ? (
                            <span className="font-medium text-secondary-ink">
                              {room.available} of {room.total} available
                            </span>
                          ) : (
                            "Fully booked"
                          )}
                        </span>
                      </p>
                      {room.description && <p className="mt-2 text-sm text-ink/80">{room.description}</p>}
                    </div>
                    <p className="sm:text-right">
                      <span className="font-display text-xl font-semibold text-brand">{formatMoney(room.price)}</span>
                      <span className="block text-xs text-muted">{PERIOD_LABEL[room.period]}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {hostel.description && (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-2xl font-semibold">
                About this hostel
              </h2>
              <div className="mt-3">
                <RichText source={hostel.description} />
              </div>
            </section>
          )}

          {hostel.amenities.length > 0 && (
            <section aria-labelledby="amenities-heading">
              <h2 id="amenities-heading" className="text-2xl font-semibold">
                Amenities
              </h2>
              <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {hostel.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2.5">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-secondary-soft text-secondary-ink">
                      <Check className="size-3.5" aria-hidden />
                    </span>
                    {amenityLabel(a)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hostel.houseRules && (
            <section aria-labelledby="rules-heading">
              <h2 id="rules-heading" className="text-2xl font-semibold">
                House rules
              </h2>
              <div className="mt-3">
                <RichText source={hostel.houseRules} />
              </div>
            </section>
          )}

          {!hostel.demo && <RatingsSection hostel={hostel} />}

          <p className="text-sm text-muted">Listing updated {formatDate(hostel.updatedAt)}.</p>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-raised">
            <p>
              <span className="text-sm text-muted">From </span>
              <span className="font-display text-3xl font-semibold tracking-tight text-brand">{formatMoney(hostel.priceFrom)}</span>
            </p>
            {hostel.pricePeriod && <p className="text-sm text-muted">{PERIOD_LABEL[hostel.pricePeriod]}</p>}
            <div className="mt-5 border-t border-line pt-5">
              <h2 className="font-sans text-base font-semibold tracking-normal">See it before you pay</h2>
              <p className="mt-1 text-sm text-muted">Visit in person and check water, power and security first.</p>
              <div className="mt-4">
                <Suspense fallback={<Skeleton className="h-64" />}>
                  <InspectionSlot hostel={hostel} />
                </Suspense>
              </div>
            </div>
          </div>
          <p className="mt-4 flex gap-2 text-xs leading-relaxed text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Never pay rent before inspecting a hostel and signing an agreement. StayNest does not collect rent.
          </p>
        </aside>
      </div>
    </article>
  );
}

async function SaveSlot({ hostelId, slug }: { hostelId: string; slug: string }) {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <LinkButton href={`/sign-in?next=${encodeURIComponent(`/hostels/${slug}`)}`} variant="outline" size="md">
        Sign in to save
      </LinkButton>
    );
  }
  const supabase = await createClient();
  const { data } = await supabase.from("saved_hostels").select("hostel_id").eq("user_id", viewer.id).eq("hostel_id", hostelId).maybeSingle();
  return <SaveButton hostelId={hostelId} initiallySaved={Boolean(data)} />;
}

async function InspectionSlot({ hostel }: { hostel: HostelDetail }) {
  if (hostel.demo) {
    return <p className="rounded-md bg-sunken p-3 text-sm text-ink/75">Inspections are turned off for illustrative listings.</p>;
  }
  const viewer = await getViewer();
  const next = `/hostels/${hostel.slug}`;
  if (!viewer) {
    return (
      <div className="grid gap-2">
        <LinkButton href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign in to request an inspection</LinkButton>
        <LinkButton href={`/sign-up?next=${encodeURIComponent(next)}`} variant="outline">
          Create a free student account
        </LinkButton>
      </div>
    );
  }
  if (viewer.role !== "student") {
    return (
      <p className="rounded-md bg-sunken p-3 text-sm text-ink/75">
        Inspection requests are for student accounts.
        {hostel.contactPhone && (
          <span className="mt-2 flex items-center gap-1.5 text-ink">
            <Phone className="size-3.5" aria-hidden /> {hostel.contactPhone}
          </span>
        )}
      </p>
    );
  }
  const today = new Date();
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return (
    <InspectionForm
      hostelId={hostel.id}
      rooms={hostel.rooms.map((r) => ({ id: r.id, name: r.name, price: `${formatMoney(r.price)} ${PERIOD_LABEL[r.period]}`, available: r.available }))}
      minDate={toIso(today)}
      maxDate={toIso(new Date(today.getTime() + 120 * 864e5))}
    />
  );
}

async function RatingsSection({ hostel }: { hostel: HostelDetail }) {
  const { items, breakdown } = await getHostelRatings(hostel.id);
  return (
    <section aria-labelledby="ratings-heading" className="scroll-mt-24">
      <h2 id="ratings-heading" className="text-2xl font-semibold">
        Student ratings
      </h2>
      <p className="mt-1 text-sm text-muted">Only students whose inspection the owner accepted can rate this hostel.</p>
      {hostel.rating ? (
        <div className="mt-5 grid gap-8 rounded-lg border border-line bg-surface p-5 sm:grid-cols-[11rem_1fr] sm:p-6">
          <div>
            <p className="font-display text-5xl font-semibold tracking-tight text-brand">{formatAverage(hostel.rating.average)}</p>
            <Stars value={hostel.rating.average} size={18} className="mt-2" />
            <p className="mt-1 text-sm text-muted">
              {hostel.rating.count} {hostel.rating.count === 1 ? "rating" : "ratings"}
            </p>
          </div>
          <RatingBreakdown breakdown={breakdown} />
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-line-strong p-5 text-muted">No ratings yet.</p>
      )}
      <Suspense fallback={<Skeleton className="mt-6 h-40" />}>
        <RateSlot hostel={hostel} />
      </Suspense>
      {items.length > 0 && (
        <div className="mt-8">
          <RatingList items={items} />
        </div>
      )}
    </section>
  );
}

async function RateSlot({ hostel }: { hostel: HostelDetail }) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "student") return null;
  const { canRate, mine } = await getRatingEligibility(hostel.id, viewer.id);
  if (!canRate && !mine) {
    return <p className="mt-6 text-sm text-muted">Once the owner accepts your inspection request, you can rate this hostel here.</p>;
  }
  return (
    <div className="mt-6 rounded-lg border border-line bg-surface p-5 sm:p-6">
      <h3 className="font-sans text-base font-semibold tracking-normal">{mine ? "Your rating" : "Rate this hostel"}</h3>
      <div className="mt-3">
        <RatingForm hostelId={hostel.id} mine={mine} />
      </div>
    </div>
  );
}

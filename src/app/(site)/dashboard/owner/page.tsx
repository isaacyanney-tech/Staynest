import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BedDouble, Building2, CalendarDays, ImageIcon, MessageSquareReply, Phone, Plus, Star } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getOwnerHostels, getOwnerInspections, getOwnerPlan } from "@/lib/owner/queries";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/states";
import { RatingBadge } from "@/components/ratings/stars";
import { DashboardHeader, DashboardSkeleton, STATUS_LABEL, STATUS_TONE } from "@/components/dashboard/shell";
import { LISTING_STATUS } from "@/components/owner/listing-status";
import { InspectionResponse } from "@/components/owner/inspection-response";

export const metadata: Metadata = { title: "Owner dashboard", robots: { index: false } };

export default function OwnerDashboardPage({ searchParams }: PageProps<"/dashboard/owner">) {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <OwnerDashboard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const TIME_LABEL: Record<string, string> = { morning: "morning", afternoon: "afternoon", evening: "evening" };

async function OwnerDashboard({ searchParams }: { searchParams: PageProps<"/dashboard/owner">["searchParams"] }) {
  const viewer = await requireRole(["owner"]);
  const [hostels, plan, inspections, params] = await Promise.all([
    getOwnerHostels(viewer.id),
    getOwnerPlan(viewer.id),
    getOwnerInspections(viewer.id),
    searchParams,
  ]);
  // Rejected listings do not count towards the plan, matching the database rule.
  const used = hostels.filter((h) => h.status !== "rejected").length;
  const atLimit = plan.listingLimit !== null && used >= plan.listingLimit;
  const today = new Date().toISOString().slice(0, 10);
  const open = inspections.filter((r) => r.status === "requested" || r.status === "accepted" || r.status === "rescheduled");
  const closed = inspections.filter((r) => !open.includes(r)).slice(0, 10);
  const needsReply = inspections.filter((r) => r.status === "requested").length;
  const live = hostels.filter((h) => h.status === "published");
  const roomsOpen = live.reduce((n, h) => n + h.rooms_available, 0);
  const rated = hostels.filter((h) => h.rating_count > 0);
  const ratingCount = rated.reduce((n, h) => n + h.rating_count, 0);
  const ratingAvg = ratingCount ? rated.reduce((n, h) => n + Number(h.rating_avg) * h.rating_count, 0) / ratingCount : null;

  return (
    <>
      <DashboardHeader
        viewer={viewer}
        role="Owner"
        title="Your hostels"
        subtitle={
          needsReply
            ? `${needsReply} student${needsReply === 1 ? " is" : "s are"} waiting for a reply about an inspection.`
            : "Keep rooms and prices current so students can plan their visit."
        }
        stats={[
          {
            label: "Listings",
            value: plan.listingLimit === null ? used : `${used}/${plan.listingLimit}`,
            hint: `${live.length} live on StayNest`,
            icon: Building2,
            href: "#listings-heading",
          },
          {
            label: "Needs your reply",
            value: needsReply,
            icon: MessageSquareReply,
            href: "#requests-heading",
            tone: needsReply ? "attention" : "default",
          },
          { label: "Rooms open", value: roomsOpen, hint: "Across live listings", icon: BedDouble },
          {
            label: "Average rating",
            value: ratingAvg === null ? <span className="text-xl">No ratings</span> : ratingAvg.toFixed(1),
            hint: ratingCount
              ? `From ${ratingCount} student${ratingCount === 1 ? "" : "s"}`
              : "Students rate after an inspection",
            icon: Star,
          },
        ]}
      >
        {atLimit ? (
          <LinkButton href="/dashboard/owner/billing" variant="accent">
            Upgrade to add more
          </LinkButton>
        ) : (
          <LinkButton href="/dashboard/owner/hostels/new" variant="accent">
            <Plus className="size-4" aria-hidden />
            Add a hostel
          </LinkButton>
        )}
      </DashboardHeader>

      {params.deleted && (
        <Notice tone="success" className="mt-6">
          The draft and its photos were deleted.
        </Notice>
      )}

      <p className="mt-6 text-sm text-muted">
        {plan.name} plan:{" "}
        {plan.listingLimit === null
          ? `${used} listings, no limit`
          : `${used} of ${plan.listingLimit} listing${plan.listingLimit === 1 ? "" : "s"} used`}
        , up to {plan.photoLimit} photos each.{" "}
        <Link href="/dashboard/owner/billing" className="font-medium text-brand underline-offset-2 hover:underline">
          Plan, billing and featured placements
        </Link>
      </p>

      <section aria-labelledby="listings-heading" className="mt-8">
        <h2 id="listings-heading" className="text-xl font-semibold">
          Listings
        </h2>
        {hostels.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="List your first hostel"
            action={<LinkButton href="/dashboard/owner/hostels/new">Add a hostel</LinkButton>}
          >
            Start with the basics. You can add rooms, prices and photos before sending it to us for review.
          </EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
            {hostels.map((h) => {
              const status = LISTING_STATUS[h.status];
              return (
                <li
                  key={h.id}
                  className="relative flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-sunken/60 sm:p-5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/owner/hostels/${h.id}`}
                      className="font-semibold after:absolute after:inset-0 hover:text-brand"
                    >
                      {h.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted">
                      {h.roomCount} room type{h.roomCount === 1 ? "" : "s"}
                      {h.price_from !== null && <> · from {formatMoney(h.price_from)}</>}
                      {" · "}
                      <span className="inline-flex items-center gap-1">
                        <ImageIcon className="size-3.5" aria-hidden /> {h.photoCount} photo{h.photoCount === 1 ? "" : "s"}
                      </span>{" "}
                      · updated {formatDate(h.updated_at)}
                    </p>
                    {h.status === "rejected" && h.moderation_note && (
                      <p className="mt-1.5 text-sm text-danger">{h.moderation_note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {h.rating_count > 0 && h.rating_avg !== null && (
                      <RatingBadge average={Number(h.rating_avg)} count={h.rating_count} />
                    )}
                    {h.is_verified && <Badge tone="verified">Verified</Badge>}
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="requests-heading" className="mt-12">
        <h2 id="requests-heading" className="text-xl font-semibold">
          Inspection requests
        </h2>
        {open.length === 0 ? (
          <p className="mt-3 text-muted">No open requests. Students can request inspections once a listing is published.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {open.map((r) => (
              <li key={r.id} className="rounded-lg border border-line bg-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{r.student?.name || "A student"}</p>
                  <Badge tone={STATUS_TONE[r.status]}>
                    {r.status === "requested" ? "Needs your reply" : STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                  <CalendarDays className="size-4" aria-hidden />
                  {r.hostelName}
                  {r.roomName && <> · {r.roomName}</>} · {formatDate(r.preferredDate, { dateStyle: "full" })},{" "}
                  {TIME_LABEL[r.preferredTime] ?? r.preferredTime}
                </p>
                {r.status === "rescheduled" && r.proposedDate && (
                  <p className="mt-1 text-sm">
                    You offered <strong>{formatDate(r.proposedDate, { dateStyle: "full" })}</strong>.
                  </p>
                )}
                {r.student?.phone && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm">
                    <Phone className="size-3.5" aria-hidden />
                    <a
                      href={`tel:${r.student.phone.replace(/[^\d+]/g, "")}`}
                      className="text-brand underline-offset-2 hover:underline"
                    >
                      {r.student.phone}
                    </a>
                  </p>
                )}
                {r.message && <p className="mt-2 rounded-md bg-sunken px-3 py-2 text-sm">“{r.message}”</p>}
                <div className="mt-4 border-t border-line pt-4">
                  <InspectionResponse id={r.id} status={r.status} today={today} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {closed.length > 0 && (
          <details className="mt-6 rounded-lg border border-line bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Past requests ({closed.length})</summary>
            <ul className="divide-y divide-line border-t border-line">
              {closed.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span>
                    {r.student?.name || "A student"} · {r.hostelName} · {formatDate(r.preferredDate)}
                  </span>
                  <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </>
  );
}

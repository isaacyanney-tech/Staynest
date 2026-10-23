import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, ImageIcon, Phone, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getOwnerHostels, getOwnerInspections, getOwnerPlan } from "@/lib/owner/queries";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/states";
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

  return (
    <>
      <DashboardHeader viewer={viewer} title="Your hostels">
        {atLimit ? (
          <LinkButton href="/pricing" variant="outline">
            Upgrade to add more
          </LinkButton>
        ) : (
          <LinkButton href="/dashboard/owner/hostels/new">
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
        {plan.name} plan: {plan.listingLimit === null ? `${used} listings, no limit` : `${used} of ${plan.listingLimit} listing${plan.listingLimit === 1 ? "" : "s"} used`},
        up to {plan.photoLimit} photos each.{" "}
        <Link href="/pricing" className="font-medium text-primary underline-offset-2 hover:underline">
          Compare plans
        </Link>
      </p>

      <section aria-labelledby="listings-heading" className="mt-8">
        <h2 id="listings-heading" className="text-xl font-semibold">
          Listings
        </h2>
        {hostels.length === 0 ? (
          <EmptyState className="mt-4" title="List your first hostel" action={<LinkButton href="/dashboard/owner/hostels/new">Add a hostel</LinkButton>}>
            Start with the basics. You can add rooms, prices and photos before sending it to us for review.
          </EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
            {hostels.map((h) => {
              const status = LISTING_STATUS[h.status];
              return (
                <li key={h.id} className="relative flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-sunken/60 sm:p-5">
                  <div className="min-w-0">
                    <Link href={`/dashboard/owner/hostels/${h.id}`} className="font-semibold after:absolute after:inset-0 hover:text-primary">
                      {h.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted">
                      {h.roomCount} room type{h.roomCount === 1 ? "" : "s"}
                      {h.price_from !== null && <> · from {formatMoney(h.price_from)}</>}
                      {" · "}
                      <span className="inline-flex items-center gap-1">
                        <ImageIcon className="size-3.5" aria-hidden /> {h.photoCount} photo{h.photoCount === 1 ? "" : "s"}
                      </span>
                      {" "}· updated {formatDate(h.updated_at)}
                    </p>
                    {h.status === "rejected" && h.moderation_note && <p className="mt-1.5 text-sm text-danger">{h.moderation_note}</p>}
                  </div>
                  <div className="flex gap-1.5">
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
                  <Badge tone={STATUS_TONE[r.status]}>{r.status === "requested" ? "Needs your reply" : STATUS_LABEL[r.status]}</Badge>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                  <CalendarDays className="size-4" aria-hidden />
                  {r.hostelName}
                  {r.roomName && <> · {r.roomName}</>} · {formatDate(r.preferredDate, { dateStyle: "full" })}, {TIME_LABEL[r.preferredTime] ?? r.preferredTime}
                </p>
                {r.status === "rescheduled" && r.proposedDate && (
                  <p className="mt-1 text-sm">
                    You offered <strong>{formatDate(r.proposedDate, { dateStyle: "full" })}</strong>.
                  </p>
                )}
                {r.student?.phone && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm">
                    <Phone className="size-3.5" aria-hidden />
                    <a href={`tel:${r.student.phone.replace(/[^\d+]/g, "")}`} className="text-primary underline-offset-2 hover:underline">
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

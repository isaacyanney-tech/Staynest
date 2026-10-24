import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, ExternalLink, Phone } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getAdminHostel, type AdminHostel } from "@/lib/admin/queries";
import { amenityLabel, formatDate, formatDistance, formatMoney, GENDER_LABEL, PERIOD_SHORT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/states";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { SafeImage } from "@/components/hostels/safe-image";
import { RichText } from "@/components/cms/rich-text";
import { LISTING_STATUS } from "@/components/owner/listing-status";
import { DecisionForm } from "@/components/admin/decision-form";

export const metadata: Metadata = { title: "Review listing · Admin", robots: { index: false, follow: false } };

export default function AdminListingPage({ params }: PageProps<"/admin/listings/[id]">) {
  return (
    <>
      <Link href="/admin/listings" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/75 hover:text-brand">
        <ArrowLeft className="size-4" aria-hidden />
        Listings
      </Link>
      <Suspense fallback={<DashboardSkeleton />}>
        <Review params={params} />
      </Suspense>
    </>
  );
}

const VERIFICATION_LABEL = { pending: "Waiting for review", needs_info: "Waiting for the owner", approved: "Approved", rejected: "Rejected" } as const;

async function Review({ params }: Pick<PageProps<"/admin/listings/[id]">, "params">) {
  await requireRole(["admin"], "admin");
  const { id } = await params;
  const hostel = await getAdminHostel(id);
  if (!hostel) notFound();
  const status = LISTING_STATUS[hostel.status];
  const problems = [
    !hostel.summary && "No summary",
    hostel.rooms.length === 0 && "No room types or prices",
    hostel.photos.length === 0 && "No photos",
    hostel.owner?.is_suspended && "The owner's account is suspended",
  ].filter((p): p is string => Boolean(p));

  return (
    <div className="mt-3 lg:grid lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-8">
      <div className="min-w-0">
        <header className="border-b border-line pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-brand">{hostel.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
            <Badge tone={status.tone}>{status.label}</Badge>
            {hostel.is_verified && <Badge tone="verified">Verified</Badge>}
            {hostel.is_demo && <Badge tone="demo">Illustrative sample</Badge>}
            <span className="text-ink/70">
              Updated {formatDate(hostel.updated_at, { dateStyle: "medium", timeStyle: "short" })}
              {hostel.published_at && <> · first published {formatDate(hostel.published_at)}</>}
            </span>
          </div>
        </header>

        {problems.length > 0 && (
          <div role="status" className="mt-6 rounded-md border border-warning/25 bg-warning-soft p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-warning">
              <AlertTriangle className="size-4" aria-hidden />
              Check before approving
            </p>
            <ul className="mt-1.5 list-disc pl-6 text-ink/85">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <Block title="Summary">
          <p>{hostel.summary || <span className="text-ink/70">None given.</span>}</p>
        </Block>
        <Block title="Description">
          {hostel.description ? <RichText source={hostel.description} /> : <p className="text-ink/70">None given.</p>}
        </Block>
        <Block title="Details">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Detail label="Location">
              {[hostel.address, hostel.area, hostel.city].filter(Boolean).join(", ")}
            </Detail>
            <Detail label="Nearest campus">
              {hostel.university ? `${hostel.university.short_name}${hostel.distance_km !== null ? `, ${formatDistance(hostel.distance_km)}` : ""}` : "Not given"}
            </Detail>
            <Detail label="Who can stay">{GENDER_LABEL[hostel.gender_policy]}</Detail>
            <Detail label="Phone on listing">{hostel.contact_phone ?? "None"}</Detail>
            <Detail label="Amenities" wide>
              {hostel.amenities.length ? hostel.amenities.map(amenityLabel).join(", ") : "None listed"}
            </Detail>
            <Detail label="House rules" wide>
              {hostel.house_rules || "None given"}
            </Detail>
          </dl>
        </Block>
        <Block title={`Rooms (${hostel.rooms.length})`}>
          {hostel.rooms.length === 0 ? (
            <p className="text-ink/70">No rooms yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {hostel.rooms.map((r) => (
                <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                  <span>
                    <span className="font-medium">{r.name}</span>
                    <span className="block text-sm text-ink/70">
                      {r.occupancy} per room · {r.available_rooms} of {r.total_rooms} available
                    </span>
                  </span>
                  <span className="font-semibold">
                    {formatMoney(r.price_amount)} <span className="text-sm font-normal text-ink/70">{PERIOD_SHORT[r.price_period]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>
        <Block title={`Photos (${hostel.photos.length})`}>
          {hostel.photos.length === 0 ? (
            <p className="text-ink/70">No photos yet.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {hostel.photos.map((p) => (
                <li key={p.id}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-sunken">
                    <SafeImage src={p.url} alt={p.alt} fill sizes="(min-width: 1024px) 220px, 45vw" className="object-cover" />
                  </div>
                  <p className="mt-1 text-xs text-ink/75">{p.alt}</p>
                </li>
              ))}
            </ul>
          )}
        </Block>
      </div>

      <aside className="mt-8 space-y-4 lg:sticky lg:top-6 lg:mt-0">
        <Panel title="Owner">
          {hostel.is_demo ? (
            <p className="text-sm text-ink/75">Illustrative sample added by StayNest.</p>
          ) : hostel.owner ? (
            <>
              <p className="font-medium">{hostel.owner.full_name || "Unnamed owner"}</p>
              {hostel.owner.phone && (
                <p className="mt-1 flex items-center gap-1.5 text-sm">
                  <Phone className="size-3.5" aria-hidden />
                  {hostel.owner.phone}
                </p>
              )}
              <Link href={`/admin/users?q=${encodeURIComponent(hostel.owner.full_name)}`} className="mt-2 inline-block text-sm font-medium text-brand hover:underline">
                Manage account
              </Link>
            </>
          ) : (
            <p className="text-sm text-ink/75">No owner on record.</p>
          )}
        </Panel>
        <Panel title="Verification">
          {hostel.verifications.length === 0 ? (
            <p className="text-sm text-ink/75">The owner has not asked to be verified.</p>
          ) : (
            <Link href={`/admin/verification/${hostel.verifications[0].id}`} className="text-sm font-medium text-brand hover:underline">
              {VERIFICATION_LABEL[hostel.verifications[0].status]} · {formatDate(hostel.verifications[0].submitted_at)}
            </Link>
          )}
        </Panel>
        {hostel.status === "published" && (
          <LinkButton href={`/hostels/${hostel.slug}`} variant="outline" className="w-full">
            View public page
            <ExternalLink className="size-4" aria-hidden />
          </LinkButton>
        )}
        <Panel title="Moderation">
          <Moderation hostel={hostel} />
        </Panel>
      </aside>
    </div>
  );
}

function Moderation({ hostel }: { hostel: AdminHostel }) {
  const note = hostel.moderation_note && (
    <Notice tone={hostel.status === "suspended" ? "warning" : "danger"} title="Note sent to the owner" className="mb-4">
      {hostel.moderation_note}
    </Notice>
  );
  const hint = "The owner sees this note on their listing.";
  const suspend = {
    value: "suspend",
    label: "Suspend",
    description: "Hide it from students straight away, for example after a report. The owner cannot republish it.",
    needsNote: true,
    danger: true,
  };
  switch (hostel.status) {
    case "pending_review":
      return (
        <>
          {note}
          <DecisionForm
            kind="listing"
            id={hostel.id}
            noteHint={hint}
            options={[
              { value: "publish", label: "Approve and publish", description: "Students can find it in search straight away.", needsNote: false },
              { value: "reject", label: "Request changes", description: "Send it back to the owner with what to fix.", needsNote: true },
            ]}
          />
        </>
      );
    case "published":
      // Same shape as the other branches, so the form keeps its success message.
      return (
        <>
          {note}
          <DecisionForm
            kind="listing"
            id={hostel.id}
            noteHint={hint}
            options={[
              { value: "reject", label: "Unpublish and request changes", description: "Take it down until the owner fixes something.", needsNote: true },
              suspend,
            ]}
          />
        </>
      );
    case "suspended":
      return (
        <>
          {note}
          <DecisionForm
            kind="listing"
            id={hostel.id}
            noteHint={hint}
            options={[
              { value: "publish", label: "Restore and publish", description: "Make it visible to students again.", needsNote: false },
              { value: "reject", label: "Send back to the owner", description: "Let the owner edit it and submit it again.", needsNote: true },
            ]}
          />
        </>
      );
    default:
      return (
        <>
          {note}
          <p className="text-sm text-ink/75">
            {hostel.status === "draft" ? "This is still a draft. The owner has not submitted it." : "Waiting for the owner to make changes and submit it again."}
          </p>
        </>
      );
  }
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 rounded-lg border border-line bg-surface p-5 text-[0.9375rem]">{children}</div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink/70">{title}</h2>
      {children}
    </section>
  );
}

function Detail({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-sm text-ink/70">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

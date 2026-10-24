import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Circle, ExternalLink, FileText, Star, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getUniversities } from "@/lib/hostels/queries";
import { getOwnerHostel, getOwnerPlan, type OwnerHostel } from "@/lib/owner/queries";
import { deleteDraft, deletePhoto, deleteRoom, movePhoto, submitForReview, withdrawFromReview } from "@/lib/actions/owner";
import { formatDate, formatMoney, PERIOD_SHORT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/states";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { SafeImage } from "@/components/hostels/safe-image";
import { HostelForm } from "@/components/owner/hostel-form";
import { LISTING_STATUS } from "@/components/owner/listing-status";
import { PhotoDetailsForm, PhotoUploadForm } from "@/components/owner/photo-forms";
import { RoomForm } from "@/components/owner/room-form";
import { VerificationForm } from "@/components/owner/verification-form";

export const metadata: Metadata = { title: "Edit listing", robots: { index: false } };

export default function EditHostelPage({ params, searchParams }: PageProps<"/dashboard/owner/hostels/[id]">) {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6">
      <Link href="/dashboard/owner" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand">
        <ArrowLeft className="size-4" aria-hidden />
        Your hostels
      </Link>
      <Suspense fallback={<DashboardSkeleton />}>
        <Editor params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Props = Pick<PageProps<"/dashboard/owner/hostels/[id]">, "params" | "searchParams">;

async function Editor({ params, searchParams }: Props) {
  const viewer = await requireRole(["owner"]);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [hostel, plan, universities] = await Promise.all([getOwnerHostel(viewer.id, id), getOwnerPlan(viewer.id), getUniversities()]);
  if (!hostel) notFound();

  const status = LISTING_STATUS[hostel.status];
  const checks = [
    { done: hostel.summary.trim().length > 0, label: "A short summary", href: "#details" },
    { done: hostel.rooms.length > 0, label: "At least one room type with a price", href: "#rooms" },
    { done: hostel.photos.length > 0, label: "At least one photo", href: "#photos" },
  ];
  const ready = checks.every((c) => c.done);

  return (
    <>
      <header className="mt-3 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-brand">{hostel.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={status.tone}>{status.label}</Badge>
            {hostel.is_verified && <Badge tone="verified">Verified</Badge>}
            <span className="text-sm text-muted">Last saved {formatDate(hostel.updated_at, { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
        </div>
        {hostel.status === "published" && (
          <LinkButton href={`/hostels/${hostel.slug}`} variant="outline">
            View public page
            <ExternalLink className="size-4" aria-hidden />
          </LinkButton>
        )}
      </header>

      {query.created && (
        <Notice tone="success" title="Draft created" className="mt-6">
          Add your room types and photos below, then submit the listing for review.
        </Notice>
      )}
      {query.incomplete && !ready && (
        <Notice tone="warning" title="A few things are missing" className="mt-6">
          Complete the checklist below before submitting for review.
        </Notice>
      )}

      <StatusPanel hostel={hostel} checks={checks} ready={ready} />

      <nav aria-label="Listing sections" className="sticky top-16 z-10 -mx-4 mt-8 overflow-x-auto border-b border-line bg-canvas/95 px-4 backdrop-blur sm:mx-0 sm:px-0">
        <ul className="flex gap-1 text-sm font-medium">
          {[
            ["#details", "Details"],
            ["#rooms", `Rooms (${hostel.rooms.length})`],
            ["#photos", `Photos (${hostel.photos.length})`],
            ["#verification", "Verification"],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="inline-block whitespace-nowrap px-3 py-3 text-muted hover:text-brand">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="details" title="Details">
        <HostelForm
          universities={universities}
          hostel={{
            id: hostel.id,
            name: hostel.name,
            summary: hostel.summary,
            description: hostel.description,
            universityId: hostel.university_id,
            address: hostel.address,
            area: hostel.area,
            city: hostel.city,
            distanceKm: hostel.distance_km,
            gender: hostel.gender_policy,
            amenities: hostel.amenities,
            houseRules: hostel.house_rules,
            contactPhone: hostel.contact_phone,
          }}
        />
      </Section>

      <Section id="rooms" title="Rooms and prices" intro="Students filter by price and room size, so list each kind of room separately.">
        {hostel.rooms.length > 0 && (
          <ul className="mb-6 divide-y divide-line rounded-md border border-line">
            {hostel.rooms.map((room) => (
              <li key={room.id} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{room.name}</p>
                  <p className="text-sm">
                    <span className="font-semibold">{formatMoney(room.price_amount)}</span> <span className="text-muted">{PERIOD_SHORT[room.price_period]}</span>
                  </p>
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {room.occupancy} per room · {room.available_rooms} of {room.total_rooms} available
                </p>
                <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-2">
                  <details className="group w-full sm:w-auto sm:flex-1">
                    <summary className="cursor-pointer text-sm font-medium text-brand">Edit {room.name}</summary>
                    <div className="mt-4">
                      <RoomForm hostelId={hostel.id} room={room} />
                    </div>
                  </details>
                  <form action={deleteRoom}>
                    <input type="hidden" name="hostelId" value={hostel.id} />
                    <input type="hidden" name="roomId" value={room.id} />
                    <button type="submit" className="text-sm font-medium text-danger hover:underline">
                      Remove {room.name}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <h3 className="mb-4 font-semibold">Add a room type</h3>
        <RoomForm hostelId={hostel.id} />
      </Section>

      <Section
        id="photos"
        title="Photos"
        intro={`The first photo is the cover. Your ${plan.name} plan allows ${plan.photoLimit} photos per hostel; ${Math.max(plan.photoLimit - hostel.photos.length, 0)} left.`}
      >
        {hostel.photos.length > 0 && (
          <ol className="mb-8 grid gap-4 sm:grid-cols-2">
            {hostel.photos.map((photo, index) => (
              <li key={photo.id} className="overflow-hidden rounded-md border border-line">
                <div className="relative aspect-[4/3] bg-sunken">
                  <SafeImage src={photo.url} alt={photo.alt} fill sizes="(min-width: 640px) 420px, 100vw" className="object-cover" />
                  {index === 0 && (
                    <Badge tone="info" className="absolute left-2 top-2 bg-surface" icon={<Star className="size-3" aria-hidden />}>
                      Cover
                    </Badge>
                  )}
                </div>
                <div className="space-y-3 p-3">
                  <div className="flex flex-wrap items-center gap-1">
                    <PhotoAction hostelId={hostel.id} photoId={photo.id} direction="earlier" disabled={index === 0} label={`Move photo ${index + 1} earlier`}>
                      <ArrowUp className="size-4" aria-hidden />
                    </PhotoAction>
                    <PhotoAction
                      hostelId={hostel.id}
                      photoId={photo.id}
                      direction="later"
                      disabled={index === hostel.photos.length - 1}
                      label={`Move photo ${index + 1} later`}
                    >
                      <ArrowDown className="size-4" aria-hidden />
                    </PhotoAction>
                    {index > 0 && (
                      <form action={movePhoto}>
                        <input type="hidden" name="hostelId" value={hostel.id} />
                        <input type="hidden" name="photoId" value={photo.id} />
                        <input type="hidden" name="direction" value="cover" />
                        <Button type="submit" size="sm" variant="ghost">
                          Make cover
                        </Button>
                      </form>
                    )}
                    <form action={deletePhoto} className="ml-auto">
                      <input type="hidden" name="hostelId" value={hostel.id} />
                      <input type="hidden" name="photoId" value={photo.id} />
                      <Button type="submit" size="sm" variant="ghost" className="text-danger" aria-label={`Delete photo ${index + 1}`}>
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </form>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-brand">Edit description of photo {index + 1}</summary>
                    <div className="mt-3">
                      <PhotoDetailsForm hostelId={hostel.id} photo={photo} />
                    </div>
                  </details>
                </div>
              </li>
            ))}
          </ol>
        )}
        <h3 className="mb-4 font-semibold">Add a photo</h3>
        {hostel.photos.length >= plan.photoLimit && (
          <Notice tone="info" className="mb-4">
            You have reached your plan&apos;s photo limit. Delete a photo or{" "}
            <Link href="/pricing" className="font-medium underline">
              upgrade your plan
            </Link>{" "}
            to add more.
          </Notice>
        )}
        <PhotoUploadForm hostelId={hostel.id} remaining={plan.photoLimit - hostel.photos.length} />
      </Section>

      <Section
        id="verification"
        title="Verification"
        intro="Verified hostels carry a badge in search. We check that you own or manage the property before adding it."
      >
        <Verification hostel={hostel} />
      </Section>

      {(hostel.status === "draft" || hostel.status === "rejected") && (
        <details className="mt-12 rounded-lg border border-danger/30 bg-surface p-5">
          <summary className="cursor-pointer font-medium text-danger">Delete this listing</summary>
          <p className="mt-3 text-sm text-muted">This removes the listing, its rooms and its photos. It cannot be undone.</p>
          <form action={deleteDraft} className="mt-4">
            <input type="hidden" name="hostelId" value={hostel.id} />
            <Button type="submit" variant="danger">
              Delete permanently
            </Button>
          </form>
        </details>
      )}
    </>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="mt-10 scroll-mt-32">
      <h2 id={`${id}-heading`} className="text-xl font-semibold">
        {title}
      </h2>
      {intro && <p className="mt-1 max-w-prose text-sm text-muted">{intro}</p>}
      <div className="mt-5 rounded-lg border border-line bg-surface p-5 sm:p-8">{children}</div>
    </section>
  );
}

function PhotoAction({
  hostelId,
  photoId,
  direction,
  disabled,
  label,
  children,
}: {
  hostelId: string;
  photoId: string;
  direction: "earlier" | "later";
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <form action={movePhoto}>
      <input type="hidden" name="hostelId" value={hostelId} />
      <input type="hidden" name="photoId" value={photoId} />
      <input type="hidden" name="direction" value={direction} />
      <Button type="submit" size="sm" variant="ghost" disabled={disabled} aria-label={label}>
        {children}
      </Button>
    </form>
  );
}

function StatusPanel({ hostel, checks, ready }: { hostel: OwnerHostel; checks: { done: boolean; label: string; href: string }[]; ready: boolean }) {
  if (hostel.status === "pending_review") {
    return (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-brand/20 bg-primary-soft p-5">
        <div>
          <p className="font-semibold text-brand">Waiting for review</p>
          <p className="mt-0.5 text-sm text-ink/80">We usually review listings within two working days. You can keep editing while you wait.</p>
        </div>
        <form action={withdrawFromReview}>
          <input type="hidden" name="hostelId" value={hostel.id} />
          <Button type="submit" variant="outline" size="sm">
            Withdraw from review
          </Button>
        </form>
      </div>
    );
  }
  if (hostel.status === "published") {
    return (
      <p className="mt-6 rounded-lg border border-success/25 bg-success-soft p-4 text-sm text-ink/85">
        This listing is live. Changes you save here appear on the public page straight away.
      </p>
    );
  }
  if (hostel.status === "suspended") {
    return (
      <Notice tone="warning" title="This listing is suspended" className="mt-6">
        {hostel.moderation_note ?? "It is hidden from students."} Contact support to restore it.
      </Notice>
    );
  }
  return (
    <div className="mt-6 rounded-lg border border-line bg-surface p-5">
      {hostel.status === "rejected" && (
        <Notice tone="danger" title="Changes requested" className="mb-5">
          {hostel.moderation_note ?? "Our reviewers asked for changes."} Update the listing and submit it again.
        </Notice>
      )}
      <p className="font-semibold">Before you submit for review</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2">
            {c.done ? <Check className="size-4 text-success" aria-hidden /> : <Circle className="size-4 text-muted" aria-hidden />}
            {c.done ? (
              <span>
                {c.label}
                <span className="sr-only"> (done)</span>
              </span>
            ) : (
              <a href={c.href} className="text-brand underline-offset-2 hover:underline">
                {c.label}
                <span className="sr-only"> (still needed)</span>
              </a>
            )}
          </li>
        ))}
      </ul>
      <form action={submitForReview} className="mt-5">
        <input type="hidden" name="hostelId" value={hostel.id} />
        <Button type="submit" disabled={!ready}>
          Submit for review
        </Button>
      </form>
    </div>
  );
}

const DOC_LABEL: Record<string, string> = {
  ownership: "Ownership",
  identity: "Photo ID",
  business_registration: "Business registration",
  other: "Other",
};

function Verification({ hostel }: { hostel: OwnerHostel }) {
  const v = hostel.verification;
  const documents = v && v.documents.length > 0 && (
    <ul className="mt-3 space-y-1 text-sm">
      {v.documents.map((d) => (
        <li key={d.id} className="flex items-center gap-2">
          <FileText className="size-4 text-muted" aria-hidden />
          <span className="min-w-0 truncate">{d.fileName}</span>
          <span className="text-muted">({DOC_LABEL[d.docType] ?? d.docType})</span>
        </li>
      ))}
    </ul>
  );

  if (hostel.is_verified) {
    return (
      <p className="flex items-center gap-2">
        <Badge tone="verified">Verified</Badge>
        <span className="text-sm text-muted">Students see the verified badge on this listing.</span>
      </p>
    );
  }
  if (v?.status === "pending") {
    return (
      <div>
        <p className="font-semibold">Documents received {formatDate(v.submittedAt)}</p>
        <p className="mt-0.5 text-sm text-muted">We usually reply within three working days.</p>
        {documents}
      </div>
    );
  }
  if (v?.status === "needs_info") {
    return (
      <div className="space-y-5">
        <Notice tone="warning" title="The reviewer needs more information">
          {v.reviewerNote ?? "Please send the documents requested."}
        </Notice>
        {documents && (
          <div>
            <p className="text-sm font-medium">Already sent</p>
            {documents}
          </div>
        )}
        <VerificationForm hostelId={hostel.id} answering />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {v?.status === "rejected" && (
        <Notice tone="danger" title="Your last request was not approved">
          {v.reviewerNote ?? "The documents did not confirm ownership."} You can apply again with new documents.
        </Notice>
      )}
      <VerificationForm hostelId={hostel.id} answering={false} />
    </div>
  );
}

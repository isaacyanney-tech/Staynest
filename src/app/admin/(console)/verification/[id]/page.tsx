import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ExternalLink, FileText, ImageIcon } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getVerification } from "@/lib/admin/queries";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/states";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { DecisionForm } from "@/components/admin/decision-form";
import { DOC_LABEL, VERIFICATION_STATUS } from "@/components/admin/verification-status";

export const metadata: Metadata = { title: "Verification request · Admin", robots: { index: false, follow: false } };

export default function AdminVerificationReviewPage({ params }: PageProps<"/admin/verification/[id]">) {
  return (
    <>
      <Link href="/admin/verification" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/75 hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden />
        Verification
      </Link>
      <Suspense fallback={<DashboardSkeleton />}>
        <Review params={params} />
      </Suspense>
    </>
  );
}

async function Review({ params }: Pick<PageProps<"/admin/verification/[id]">, "params">) {
  await requireRole(["admin"], "admin");
  const { id } = await params;
  const app = await getVerification(id);
  if (!app) notFound();
  const status = VERIFICATION_STATUS[app.status];
  const open = app.status === "pending" || app.status === "needs_info";

  return (
    <div className="mt-3 lg:grid lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-8">
      <div className="min-w-0">
        <header className="border-b border-line pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-primary">{app.hostel?.name ?? "Deleted listing"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
            <Badge tone={status.tone}>{status.label}</Badge>
            <span className="text-ink/70">
              Sent {formatDate(app.submittedAt, { dateStyle: "medium", timeStyle: "short" })} by {app.owner.name}
              {app.owner.phone && <> · {app.owner.phone}</>}
            </span>
          </div>
          {app.hostel && (
            <Link href={`/admin/listings/${app.hostel.id}`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Review the listing ({app.hostel.area}, {app.hostel.city})
            </Link>
          )}
        </header>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Owner&apos;s note</h2>
          <p className="mt-2 rounded-lg border border-line bg-surface p-4">{app.ownerNote || <span className="text-ink/70">No note.</span>}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Documents ({app.documents.length})</h2>
          <p className="mt-1 text-sm text-ink/75">Links work for 10 minutes. Reload the page for new ones. Do not download or forward these files.</p>
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
            {app.documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span className="flex min-w-0 items-center gap-3">
                  {d.isPdf ? <FileText className="size-5 shrink-0 text-ink/60" aria-hidden /> : <ImageIcon className="size-5 shrink-0 text-ink/60" aria-hidden />}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{d.fileName}</span>
                    <span className="block text-sm text-ink/70">{DOC_LABEL[d.type] ?? d.type}</span>
                  </span>
                </span>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    Open {d.fileName}
                    <ExternalLink className="size-3.5" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="text-sm text-danger">File missing</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {app.history.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Earlier requests for this listing</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {app.history.map((h) => (
                <li key={h.id} className="rounded-md border border-line bg-surface p-3">
                  <Link href={`/admin/verification/${h.id}`} className="font-medium text-primary hover:underline">
                    {formatDate(h.submitted_at)}
                  </Link>{" "}
                  · {VERIFICATION_STATUS[h.status].label}
                  {h.reviewer_note && <p className="mt-1 text-ink/75">{h.reviewer_note}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="mt-8 lg:sticky lg:top-6 lg:mt-0">
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/70">Decision</h2>
          {app.reviewerNote && (
            <Notice tone="info" title={`Last note${app.reviewerName ? ` from ${app.reviewerName}` : ""}`} className="mb-4">
              {app.reviewerNote}
            </Notice>
          )}
          {open ? (
            app.status === "needs_info" ? (
              <p className="mb-4 text-sm text-ink/75">Waiting for the owner to send more documents. You can still decide now.</p>
            ) : null
          ) : (
            <p className="text-sm text-ink/75">
              {status.label} {app.reviewedAt && `on ${formatDate(app.reviewedAt)}`}
              {app.reviewerName && ` by ${app.reviewerName}`}.
            </p>
          )}
          {open && (
            <DecisionForm
              kind="verification"
              id={app.id}
              noteHint="The owner sees this on their listing editor."
              options={[
                { value: "approved", label: "Approve", description: "The documents match the listing. Adds the verified badge.", needsNote: false },
                { value: "needs_info", label: "Ask for more", description: "Tell the owner which document is missing or unclear.", needsNote: true },
                { value: "rejected", label: "Reject", description: "The documents do not show they own or manage it.", needsNote: true, danger: true },
              ]}
            />
          )}
        </section>
      </aside>
    </div>
  );
}

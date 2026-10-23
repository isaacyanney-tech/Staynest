import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { getMediaLibrary } from "@/lib/admin/content";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { SafeImage } from "@/components/hostels/safe-image";
import { AdminPageHeader } from "@/components/admin/page-header";
import { MediaDetailsForm, MediaUploadForm } from "@/components/admin/media-forms";

export const metadata: Metadata = { title: "Media library · Admin", robots: { index: false, follow: false } };

export default function AdminMediaPage() {
  return (
    <>
      <AdminPageHeader title="Media library" description="Images for the homepage and other site pages. Hostel photos are managed by their owners and are not listed here." />
      <section aria-labelledby="upload-heading" className="mt-6 rounded-lg border border-line bg-surface p-5">
        <h2 id="upload-heading" className="mb-4 text-lg font-semibold">
          Upload an image
        </h2>
        <MediaUploadForm />
      </section>
      <Suspense fallback={<DashboardSkeleton />}>
        <Library />
      </Suspense>
    </>
  );
}

async function Library() {
  await requireRole(["admin"], "admin");
  const items = await getMediaLibrary();
  if (items.length === 0) return <EmptyState className="mt-8" title="No images yet" />;
  return (
    <section aria-labelledby="library-heading" className="mt-8">
      <h2 id="library-heading" className="text-lg font-semibold">
        {items.length === 1 ? "1 image" : `${items.length} images`}
      </h2>
      <ul className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((m) => (
          <li key={m.id} className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="relative aspect-[4/3] bg-sunken">
              <SafeImage src={m.url} alt={m.alt_text} fill sizes="(min-width: 1280px) 320px, (min-width: 768px) 45vw, 90vw" className="object-cover" />
            </div>
            <div className="space-y-2 p-4">
              <p className="flex flex-wrap gap-1.5">
                {m.status !== "active" && <Badge tone="warning">Hidden from editor</Badge>}
                {m.is_illustrative && <Badge tone="demo">Illustrative</Badge>}
                {m.external_url && <Badge>External link</Badge>}
              </p>
              <p className="text-sm font-medium">{m.alt_text || "No description"}</p>
              <p className="text-xs text-ink/70">
                {m.width && m.height ? `${m.width} × ${m.height} · ` : ""}
                added {formatDate(m.created_at)}
                {m.credit && <> · {m.credit}</>}
              </p>
              <details className="pt-1">
                <summary className="cursor-pointer text-sm font-medium text-primary">Edit details</summary>
                <div className="mt-3">
                  <MediaDetailsForm item={m} />
                </div>
              </details>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

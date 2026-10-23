import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice } from "@/components/ui/states";
import { DashboardHeader, DashboardSkeleton, STATUS_LABEL, STATUS_TONE } from "@/components/dashboard/shell";

export const metadata: Metadata = { title: "Owner dashboard", robots: { index: false } };

const LISTING_STATUS = {
  draft: { label: "Draft", tone: "neutral" },
  pending_review: { label: "In review", tone: "info" },
  published: { label: "Published", tone: "success" },
  rejected: { label: "Changes needed", tone: "danger" },
  archived: { label: "Archived", tone: "neutral" },
} as const;

export default function OwnerDashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <OwnerDashboard />
      </Suspense>
    </div>
  );
}

async function OwnerDashboard() {
  const viewer = await requireRole(["owner"]);
  const supabase = await createClient();
  const [{ data: hostels }, { data: requests }] = await Promise.all([
    supabase.from("hostels").select("id, name, status, rooms_available, is_verified, updated_at").eq("owner_id", viewer.id).order("updated_at", { ascending: false }),
    supabase
      .from("inspection_requests")
      .select("id, status, preferred_date, preferred_time, message, hostels!inner(name, owner_id), profiles(full_name)")
      .eq("hostels.owner_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <>
      <DashboardHeader viewer={viewer} title="Your hostels" />
      <Notice tone="info" title="Listing editor arrives in the next release" className="mt-8">
        Creating and editing listings, room prices, photos and verification will appear on this page shortly.
      </Notice>

      <section aria-labelledby="listings-heading" className="mt-10">
        <h2 id="listings-heading" className="text-xl font-semibold">
          Listings
        </h2>
        {!hostels?.length ? (
          <EmptyState className="mt-4" title="No listings yet">
            Your hostels will appear here with their review status.
          </EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
            {hostels.map((h) => {
              const status = LISTING_STATUS[h.status as keyof typeof LISTING_STATUS] ?? LISTING_STATUS.draft;
              return (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{h.name}</p>
                    <p className="text-sm text-muted">Updated {formatDate(h.updated_at)}</p>
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
          Recent inspection requests
        </h2>
        {!requests?.length ? (
          <p className="mt-3 text-muted">Requests from students appear here once a listing is published.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
            {requests.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{r.profiles?.full_name || "A student"}</p>
                  <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </div>
                <p className="text-sm text-muted">
                  {r.hostels.name} · {formatDate(r.preferred_date)} ({r.preferred_time})
                </p>
                {r.message && <p className="mt-2 text-sm">“{r.message}”</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

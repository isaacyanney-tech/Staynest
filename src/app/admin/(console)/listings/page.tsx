import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { ADMIN_PAGE_SIZE, getAdminListings, getListingCounts } from "@/lib/admin/queries";
import { formatDate } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { LISTING_STATUS } from "@/components/owner/listing-status";
import { AdminPageHeader, FilterTabs } from "@/components/admin/page-header";
import { SearchBox } from "@/components/admin/search-box";

export const metadata: Metadata = { title: "Listings · Admin", robots: { index: false, follow: false } };

const TABS: { status: Enums<"listing_status">; label: string }[] = [
  { status: "pending_review", label: "Waiting for review" },
  { status: "published", label: "Published" },
  { status: "rejected", label: "Changes requested" },
  { status: "suspended", label: "Suspended" },
  { status: "draft", label: "Drafts" },
];

export default function AdminListingsPage({ searchParams }: PageProps<"/admin/listings">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Listings searchParams={searchParams} />
    </Suspense>
  );
}

async function Listings({ searchParams }: Pick<PageProps<"/admin/listings">, "searchParams">) {
  await requireRole(["admin"], "admin");
  const sp = await searchParams;
  const status = TABS.find((t) => t.status === sp.status)?.status ?? "pending_review";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ rows, total }, counts] = await Promise.all([getAdminListings({ status, q, page }), getListingCounts()]);
  const pages = Math.ceil(total / ADMIN_PAGE_SIZE);
  const href = (p: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, q: q || undefined, ...p })) if (v !== undefined && v !== "") params.set(k, String(v));
    return `/admin/listings?${params}`;
  };

  return (
    <>
      <AdminPageHeader title="Listings" description="Approve new listings before students can see them, and act on reports.">
        <SearchBox action="/admin/listings" label="Search by name or area" defaultValue={q} hidden={{ status }} />
      </AdminPageHeader>
      <FilterTabs
        label="Listing status"
        items={TABS.map((t) => ({ href: href({ status: t.status, q: undefined, page: undefined }), label: t.label, count: counts[t.status] ?? 0, active: t.status === status }))}
      />
      {rows.length === 0 ? (
        <EmptyState className="mt-6" title={q ? "No listings match that search" : "Nothing here"}>
          {status === "pending_review" && !q ? "New listings appear here when owners submit them for review." : null}
        </EmptyState>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">{TABS.find((t) => t.status === status)?.label} listings</caption>
            <thead className="border-b border-line bg-sunken/60 text-ink/75">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Listing</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Owner</th>
                <th scope="col" className="px-4 py-2.5 font-medium">{status === "pending_review" ? "Submitted" : "Updated"}</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((h) => (
                <tr key={h.id} className="hover:bg-sunken/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/listings/${h.id}`} className="font-semibold text-brand hover:underline">
                      {h.name}
                    </Link>
                    <span className="block text-ink/70">
                      {h.area}, {h.city}
                    </span>
                  </td>
                  <td className="px-4 py-3">{h.is_demo ? <span className="text-ink/70">Sample listing</span> : (h.ownerName ?? "—")}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(h.updated_at)}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      <Badge tone={LISTING_STATUS[h.status].tone}>{LISTING_STATUS[h.status].label}</Badge>
                      {h.is_verified && <Badge tone="verified">Verified</Badge>}
                      {h.is_demo && <Badge tone="demo">Illustrative</Badge>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-6">
        <Pagination page={page} pages={pages} hrefFor={(p) => href({ page: p })} />
      </div>
    </>
  );
}

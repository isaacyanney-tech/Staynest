import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { ADMIN_PAGE_SIZE, getAdminRatings } from "@/lib/admin/queries";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { AdminPageHeader, FilterTabs } from "@/components/admin/page-header";
import { RatingModerationForm } from "@/components/admin/rating-moderation-form";
import { Stars } from "@/components/ratings/stars";

export const metadata: Metadata = { title: "Ratings · Admin", robots: { index: false, follow: false } };

const TABS = [
  { filter: undefined, label: "All" },
  { filter: "visible", label: "Visible" },
  { filter: "hidden", label: "Hidden" },
] as const;

export default function AdminRatingsPage({ searchParams }: PageProps<"/admin/ratings">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Ratings searchParams={searchParams} />
    </Suspense>
  );
}

async function Ratings({ searchParams }: Pick<PageProps<"/admin/ratings">, "searchParams">) {
  await requireRole(["admin"], "admin");
  const sp = await searchParams;
  const filter = sp.show === "visible" || sp.show === "hidden" ? sp.show : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await getAdminRatings(filter, page);
  const href = (p: { filter?: string; page?: number }) => {
    const params = new URLSearchParams();
    if (p.filter) params.set("show", p.filter);
    if (p.page && p.page > 1) params.set("page", String(p.page));
    const s = params.toString();
    return s ? `/admin/ratings?${s}` : "/admin/ratings";
  };

  return (
    <>
      <AdminPageHeader
        title="Ratings"
        description="Students can rate a hostel after its owner accepts their inspection request. Hide a rating that is abusive, off-topic or shares private details; hidden ratings no longer count towards the hostel's average."
      />
      <FilterTabs label="Which ratings" items={TABS.map((t) => ({ href: href({ filter: t.filter }), label: t.label, active: t.filter === filter }))} />
      {rows.length === 0 ? (
        <EmptyState className="mt-6" title={filter === "hidden" ? "No hidden ratings" : "No ratings yet"} />
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <Stars value={r.stars} size={15} />
                  <span className="sr-only">{r.stars} out of 5.</span>
                  <span className="font-semibold">{r.reviewer}</span>
                  {r.hidden && <Badge tone="danger">Hidden</Badge>}
                </p>
                <p className="mt-1 text-sm text-ink/75">
                  {r.hostel.slug ? (
                    <Link href={`/hostels/${r.hostel.slug}`} className="font-medium text-brand hover:underline">
                      {r.hostel.name}
                    </Link>
                  ) : (
                    r.hostel.name
                  )}{" "}
                  · {formatDate(r.createdAt)}
                </p>
                {r.comment ? <p className="mt-2 whitespace-pre-line">{r.comment}</p> : <p className="mt-2 text-sm text-muted">No comment.</p>}
                {r.hidden && r.hiddenReason && <p className="mt-2 text-sm text-danger">Hidden because: {r.hiddenReason}</p>}
              </div>
              <RatingModerationForm id={r.id} hidden={r.hidden} />
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pages={Math.ceil(total / ADMIN_PAGE_SIZE)} hrefFor={(p) => href({ filter, page: p })} />
    </>
  );
}

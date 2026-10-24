import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { ADMIN_PAGE_SIZE, getVerificationQueue } from "@/lib/admin/queries";
import { formatDate } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { AdminPageHeader, FilterTabs } from "@/components/admin/page-header";
import { VERIFICATION_STATUS } from "@/components/admin/verification-status";

export const metadata: Metadata = { title: "Verification · Admin", robots: { index: false, follow: false } };

const TABS: Enums<"verification_status">[] = ["pending", "needs_info", "approved", "rejected"];

export default function AdminVerificationPage({ searchParams }: PageProps<"/admin/verification">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Queue searchParams={searchParams} />
    </Suspense>
  );
}

async function Queue({ searchParams }: Pick<PageProps<"/admin/verification">, "searchParams">) {
  await requireRole(["admin"], "admin");
  const sp = await searchParams;
  const status = TABS.find((t) => t === sp.status) ?? "pending";
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await getVerificationQueue(status, page);

  return (
    <>
      <AdminPageHeader
        title="Verification"
        description="Owners send proof that they own or manage a hostel. Approving adds the verified badge to their listing."
      />
      <FilterTabs label="Request status" items={TABS.map((t) => ({ href: `/admin/verification?status=${t}`, label: VERIFICATION_STATUS[t].label, active: t === status }))} />
      {rows.length === 0 ? (
        <EmptyState className="mt-6" title="Nothing here">
          {status === "pending" ? "New requests appear here when owners send documents." : null}
        </EmptyState>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="relative flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-sunken/50">
              <div>
                <Link href={`/admin/verification/${r.id}`} className="font-semibold text-brand after:absolute after:inset-0 hover:underline">
                  {r.hostel?.name ?? "Deleted listing"}
                </Link>
                <p className="text-sm text-ink/70">
                  {r.ownerName ?? "Unknown owner"} · {r.documentCount} document{r.documentCount === 1 ? "" : "s"} · sent {formatDate(r.submittedAt)}
                </p>
              </div>
              <Badge tone={VERIFICATION_STATUS[r.status].tone}>{VERIFICATION_STATUS[r.status].label}</Badge>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6">
        <Pagination page={page} pages={Math.ceil(total / ADMIN_PAGE_SIZE)} hrefFor={(p) => `/admin/verification?status=${status}&page=${p}`} />
      </div>
    </>
  );
}

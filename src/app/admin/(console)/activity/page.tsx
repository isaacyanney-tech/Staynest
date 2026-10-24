import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { getAuditLog } from "@/lib/admin/queries";
import { changedFields, describeAudit } from "@/lib/admin/audit";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { AdminPageHeader, FilterTabs } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Activity log · Admin", robots: { index: false, follow: false } };

const PER_PAGE = 50;

const TABS: { entity?: string; label: string }[] = [
  { label: "Everything" },
  { entity: "hostels", label: "Listings" },
  { entity: "verification_applications", label: "Verification" },
  { entity: "profiles", label: "People" },
  { entity: "plans", label: "Plans" },
  { entity: "business_settings", label: "Settings" },
  { entity: "page_sections", label: "Content" },
];

/** Where an entry's subject can be opened, when there is a page for it. */
function linkFor(entity: string, id: string | null): string | null {
  if (!id) return null;
  if (entity === "hostels") return `/admin/listings/${id}`;
  if (entity === "verification_applications") return `/admin/verification/${id}`;
  return null;
}

export default function AdminActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  return (
    <>
      <AdminPageHeader title="Activity log" description="Every moderation decision and change to access, prices and settings, newest first. Entries cannot be edited or deleted." />
      <Suspense fallback={<DashboardSkeleton />}>
        <Activity searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Activity({ searchParams }: Pick<PageProps<"/admin/activity">, "searchParams">) {
  await requireRole(["admin"], "admin");
  const sp = await searchParams;
  const entity = TABS.find((t) => t.entity && t.entity === sp.entity)?.entity;
  const page = Math.max(1, Number(sp.page) || 1);
  const { entries, total } = await getAuditLog({ limit: PER_PAGE, entity, page });
  const href = (p: { entity?: string; page?: number }) => {
    const params = new URLSearchParams();
    if (p.entity) params.set("entity", p.entity);
    if (p.page && p.page > 1) params.set("page", String(p.page));
    const s = params.toString();
    return s ? `/admin/activity?${s}` : "/admin/activity";
  };

  return (
    <>
      <FilterTabs label="Filter activity" items={TABS.map((t) => ({ href: href({ entity: t.entity }), label: t.label, active: t.entity === entity }))} />
      {entries.length === 0 ? (
        <EmptyState className="mt-6" title="Nothing recorded yet" />
      ) : (
        <ol className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
          {entries.map((e) => {
            const changes = changedFields(e.details);
            const link = linkFor(e.entity, e.entityId);
            return (
              <li key={e.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span>
                    <span className="font-medium">{e.actorName ?? "System"}</span> · {describeAudit(e)}
                    {link && (
                      <>
                        {" "}
                        <Link href={link} className="font-medium text-brand hover:underline">
                          Open
                        </Link>
                      </>
                    )}
                  </span>
                  <time dateTime={e.createdAt} className="text-ink/70">
                    {formatDate(e.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                </div>
                {changes.length > 0 && (
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-ink/75 hover:text-ink">
                      {changes.length === 1 ? "1 field changed" : `${changes.length} fields changed`}
                    </summary>
                    <dl className="mt-2 grid gap-x-4 gap-y-1 rounded-md bg-sunken/60 p-3 sm:grid-cols-[10rem_1fr]">
                      {changes.map((c) => (
                        <div key={c.field} className="contents">
                          <dt className="font-mono text-xs text-ink/75">{c.field}</dt>
                          <dd className="min-w-0 break-words">
                            <span className="text-ink/70 line-through">{c.before}</span> → {c.after}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <div className="mt-6">
        <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} hrefFor={(p) => href({ entity, page: p })} />
      </div>
    </>
  );
}

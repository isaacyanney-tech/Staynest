import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { ADMIN_PAGE_SIZE, getUsers } from "@/lib/admin/queries";
import { formatDate } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { AdminPageHeader, FilterTabs } from "@/components/admin/page-header";
import { SearchBox } from "@/components/admin/search-box";
import { AccessForm } from "@/components/admin/access-form";

export const metadata: Metadata = { title: "People · Admin", robots: { index: false, follow: false } };

const TABS: { role?: Enums<"app_role">; label: string }[] = [
  { label: "Everyone" },
  { role: "student", label: "Students" },
  { role: "owner", label: "Owners" },
  { role: "admin", label: "Administrators" },
];

export default function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Users searchParams={searchParams} />
    </Suspense>
  );
}

async function Users({ searchParams }: Pick<PageProps<"/admin/users">, "searchParams">) {
  const viewer = await requireRole(["admin"], "admin");
  const sp = await searchParams;
  const role = TABS.find((t) => t.role && t.role === sp.role)?.role;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await getUsers({ q, role, page });
  const pages = Math.ceil(total / ADMIN_PAGE_SIZE);
  const href = (p: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ role, q: q || undefined, ...p })) if (v !== undefined && v !== "") params.set(k, String(v));
    const s = params.toString();
    return s ? `/admin/users?${s}` : "/admin/users";
  };

  return (
    <>
      <AdminPageHeader
        title="People"
        description="Change what an account can do. A suspended account can still sign in, but loses everything its role allows, such as listing hostels or sending enquiries."
      >
        <SearchBox action="/admin/users" label="Search by name or email" defaultValue={q} hidden={{ role }} />
      </AdminPageHeader>
      <FilterTabs
        label="Account type"
        items={TABS.map((t) => ({ href: href({ role: t.role, q: undefined, page: undefined }), label: t.label, active: t.role === role }))}
      />
      {rows.length === 0 ? (
        <EmptyState className="mt-6" title={q ? "No accounts match that search" : "No accounts yet"} />
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
          {rows.map((u) => {
            const name = u.full_name || "Unnamed account";
            const self = u.id === viewer.id;
            return (
              <li key={u.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                    {name}
                    {self && <Badge tone="info">You</Badge>}
                    {u.is_suspended && <Badge tone="danger">Suspended</Badge>}
                  </p>
                  <p className="truncate text-sm text-ink/75">
                    {u.email}
                    {u.phone && <> · {u.phone}</>}
                  </p>
                  <p className="text-xs text-ink/70">Joined {formatDate(u.created_at)}</p>
                </div>
                {self ? (
                  <p className="text-sm text-ink/75">Another administrator must change your own access.</p>
                ) : (
                  <AccessForm userId={u.id} name={name} role={u.role} suspended={u.is_suspended} />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-6">
        <Pagination page={page} pages={pages} hrefFor={(p) => href({ page: p })} />
      </div>
    </>
  );
}

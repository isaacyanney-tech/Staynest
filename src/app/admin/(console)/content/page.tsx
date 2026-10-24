import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { getContentPages } from "@/lib/admin/content";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PAGE_NAME, publicPath, SECTION_STATE } from "@/components/admin/content-status";

export const metadata: Metadata = { title: "Pages and content · Admin", robots: { index: false, follow: false } };

export default function AdminContentPage() {
  return (
    <>
      <AdminPageHeader
        title="Pages and content"
        description="Edit the words on the site. Changes are saved as drafts you can preview, and only reach visitors when you publish them."
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <Pages />
      </Suspense>
    </>
  );
}

async function Pages() {
  await requireRole(["admin"], "admin");
  const pages = await getContentPages();
  return (
    <ul className="mt-6 grid gap-4 md:grid-cols-2">
      {pages.map((page) => {
        const pending = page.sections.filter((s) => s.state === "changed" || s.state === "draft").length;
        const path = publicPath(page.slug);
        return (
          <li key={page.id} className="flex flex-col rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                <Link href={`/admin/content/${page.slug}`} className="text-brand hover:underline">
                  {PAGE_NAME[page.slug] ?? page.title}
                </Link>
              </h2>
              {path && <span className="font-mono text-xs text-ink/70">{path}</span>}
            </div>
            <p className="mt-1 text-sm text-ink/75">
              {page.sections.length === 1 ? "1 section" : `${page.sections.length} sections`} · updated {formatDate(page.updated_at)}
            </p>
            <p className="mt-3 flex flex-wrap gap-1.5">
              {pending > 0 ? (
                <Badge tone={SECTION_STATE.changed.tone}>{pending === 1 ? "1 section with unpublished changes" : `${pending} sections with unpublished changes`}</Badge>
              ) : (
                <Badge tone="success">Everything published</Badge>
              )}
              {!page.is_published && <Badge tone="warning">Page hidden</Badge>}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

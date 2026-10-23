import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getSectionForEdit } from "@/lib/admin/content";
import { SECTION_FIELDS, withDefaults } from "@/lib/cms/fields";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SectionEditor } from "@/components/admin/section-editor";
import { UnpublishForm } from "@/components/admin/unpublish-form";
import { PAGE_NAME, SECTION_STATE } from "@/components/admin/content-status";

export const metadata: Metadata = { title: "Edit section · Admin", robots: { index: false, follow: false } };

export default function AdminSectionPage({ params }: PageProps<"/admin/content/[slug]/[key]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Section params={params} />
    </Suspense>
  );
}

async function Section({ params }: Pick<PageProps<"/admin/content/[slug]/[key]">, "params">) {
  await requireRole(["admin"], "admin");
  const { slug, key } = await params;
  const data = await getSectionForEdit(slug, key);
  if (!data) notFound();
  const { page, section, revisions, options } = data;
  const fields = SECTION_FIELDS[section.type];
  const state = SECTION_STATE[section.state];

  return (
    <>
      <Link href={`/admin/content/${page.slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/75 hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden />
        {PAGE_NAME[page.slug] ?? page.title}
      </Link>
      <div className="mt-3">
        <AdminPageHeader title={section.label} description={<Badge tone={state.tone}>{state.label}</Badge>}>
          <LinkButton href={`/admin/preview/${page.slug}`} variant="outline" target="_blank" rel="noopener">
            <Eye className="size-4" aria-hidden />
            Preview saved draft
          </LinkButton>
        </AdminPageHeader>
      </div>
      <SectionEditor
        sectionId={section.id}
        fields={fields}
        initial={withDefaults(fields, section.draft ?? section.published)}
        options={options}
        revisions={revisions}
        aside={
          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink/70">On the site</h2>
            {section.published === null ? (
              <p className="text-sm text-ink/75">Not published. Visitors do not see this section.</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-ink/75">
                  {section.is_visible ? "Live" : "Published but hidden"}
                  {section.published_at && <> since {formatDate(section.published_at, { dateStyle: "medium", timeStyle: "short" })}</>}.
                </p>
                <UnpublishForm sectionId={section.id} />
              </>
            )}
          </section>
        }
      />
    </>
  );
}

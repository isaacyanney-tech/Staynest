import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getContentPage } from "@/lib/admin/content";
import { arrangeSection } from "@/lib/actions/content";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PageDetailsForm } from "@/components/admin/page-details-form";
import { PAGE_NAME, publicPath, SECTION_STATE } from "@/components/admin/content-status";

export const metadata: Metadata = { title: "Edit page · Admin", robots: { index: false, follow: false } };

export default function AdminContentPageEditor({ params }: PageProps<"/admin/content/[slug]">) {
  return (
    <>
      <Link href="/admin/content" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/75 hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden />
        Pages and content
      </Link>
      <Suspense fallback={<DashboardSkeleton />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: Pick<PageProps<"/admin/content/[slug]">, "params">) {
  await requireRole(["admin"], "admin");
  const { slug } = await params;
  const page = await getContentPage(slug);
  if (!page) notFound();
  const path = publicPath(page.slug);
  const pending = page.sections.some((s) => s.state === "changed" || s.state === "draft");

  return (
    <>
      <div className="mt-3">
        <AdminPageHeader title={PAGE_NAME[page.slug] ?? page.title} description={path ? <span className="font-mono text-sm">{path}</span> : "Shown at the bottom of every page."}>
          <LinkButton href={`/admin/preview/${page.slug}`} variant="outline" target="_blank" rel="noopener">
            <Eye className="size-4" aria-hidden />
            Preview drafts
          </LinkButton>
          {path && (
            <LinkButton href={path} variant="ghost" target="_blank" rel="noopener">
              Live page
              <ExternalLink className="size-4" aria-hidden />
            </LinkButton>
          )}
        </AdminPageHeader>
      </div>
      {pending && <p className="mt-4 text-sm text-ink/75">Some sections have changes that are not live yet. Open a section to publish it.</p>}

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
        <section aria-labelledby="sections-heading">
          <h2 id="sections-heading" className="text-lg font-semibold">
            Sections
          </h2>
          <p className="mt-1 text-sm text-ink/75">In the order they appear. Hiding or moving a section takes effect straight away.</p>
          <ol className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
            {page.sections.map((s, i) => {
              const state = SECTION_STATE[s.state];
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/content/${page.slug}/${s.key}`} className="font-semibold text-primary hover:underline">
                      {s.label}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-ink/70">
                      <Badge tone={state.tone}>{state.label}</Badge>
                      {!s.is_visible && <Badge tone="warning">Hidden</Badge>}
                      {s.published_at && <span>published {formatDate(s.published_at)}</span>}
                    </p>
                  </div>
                  <form action={arrangeSection} className="flex gap-1">
                    <input type="hidden" name="sectionId" value={s.id} />
                    <ArrangeButton op="up" label={`Move ${s.label} up`} disabled={i === 0}>
                      <ArrowUp className="size-4" aria-hidden />
                    </ArrangeButton>
                    <ArrangeButton op="down" label={`Move ${s.label} down`} disabled={i === page.sections.length - 1}>
                      <ArrowDown className="size-4" aria-hidden />
                    </ArrangeButton>
                    <ArrangeButton op={s.is_visible ? "hide" : "show"} label={s.is_visible ? `Hide ${s.label}` : `Show ${s.label}`}>
                      {s.is_visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                    </ArrangeButton>
                  </form>
                </li>
              );
            })}
          </ol>
        </section>
        {page.slug !== "global" && (
          <section aria-labelledby="details-heading" className="mt-8 rounded-lg border border-line bg-surface p-5 lg:mt-0">
            <h2 id="details-heading" className="mb-4 text-lg font-semibold">
              Page details
            </h2>
            <PageDetailsForm page={page} />
          </section>
        )}
      </div>
    </>
  );
}

function ArrangeButton({ op, label, disabled, children }: { op: string; label: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      name="op"
      value={op}
      aria-label={label}
      title={label}
      disabled={disabled}
      className="inline-flex size-9 items-center justify-center rounded-md border border-line text-ink/75 hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

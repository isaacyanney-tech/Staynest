import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getPagePreview } from "@/lib/admin/content";
import { findSection } from "@/lib/cms/queries";
import { HomeSections } from "@/components/home/home-sections";
import { CmsSections } from "@/components/cms/cms-page";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { DashboardSkeleton } from "@/components/dashboard/shell";

export const metadata: Metadata = { title: "Preview · Admin", robots: { index: false, follow: false } };

/** A page as visitors will see it once its saved drafts are published. */
export default function PreviewPage({ params }: PageProps<"/admin/preview/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-10"><DashboardSkeleton /></div>}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: Pick<PageProps<"/admin/preview/[slug]">, "params">) {
  await requireRole(["admin"], "admin");
  const { slug } = await params;
  const page = await getPagePreview(slug);
  if (!page) notFound();
  const global = slug === "global";

  return (
    <>
      <div role="status" className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 bg-warning px-4 py-2 text-sm text-white sm:px-6">
        <p>
          <strong className="font-semibold">Preview.</strong> Saved drafts are shown; visitors still see the published version.
        </p>
        <Link href={`/admin/content/${slug}`} className="inline-flex items-center gap-1 font-medium underline underline-offset-2">
          <ArrowLeft className="size-4" aria-hidden />
          Back to the editor
        </Link>
      </div>
      <SiteHeader />
      <main id="main" className="flex-1">
        {slug === "home" ? (
          <HomeSections sections={page.sections} />
        ) : global ? (
          <p className="mx-auto max-w-3xl px-4 py-16 text-center text-muted sm:px-6">The footer below shows your saved draft.</p>
        ) : (
          <CmsSections slug={slug} sections={page.sections} updatedAt={page.updatedAt} />
        )}
      </main>
      <SiteFooter preview={global ? findSection(page.sections, "footer") : undefined} />
    </>
  );
}

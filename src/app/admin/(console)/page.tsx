import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/site/logo";
import { Notice } from "@/components/ui/states";
import { DashboardHeader, DashboardSkeleton } from "@/components/dashboard/shell";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminHomePage() {
  return (
    <div className="min-h-full bg-bg">
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="rounded-md">
            <Wordmark />
            <span className="sr-only">View site</span>
          </Link>
          <span className="ml-3 rounded-sm bg-primary px-1.5 py-0.5 text-xs font-medium text-white">Admin</span>
        </div>
      </div>
      <main id="main" className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <Overview />
        </Suspense>
      </main>
    </div>
  );
}

async function Overview() {
  const viewer = await requireRole(["admin"], "admin");
  const supabase = await createClient();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [pending, published, verifications, students, owners] = await Promise.all([
    count(supabase.from("hostels").select("id", { count: "exact", head: true }).eq("status", "pending_review")),
    count(supabase.from("hostels").select("id", { count: "exact", head: true }).eq("status", "published").eq("is_demo", false)),
    count(supabase.from("verification_applications").select("id", { count: "exact", head: true }).in("status", ["pending", "needs_info"])),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student")),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner")),
  ]);
  const stats = [
    { label: "Listings waiting for review", value: pending },
    { label: "Verification requests", value: verifications },
    { label: "Published listings", value: published },
    { label: "Students", value: students },
    { label: "Owners", value: owners },
  ];
  return (
    <>
      <DashboardHeader viewer={viewer} title="Overview" />
      <dl className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-surface p-4">
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-1 font-display text-3xl font-semibold text-primary">{s.value}</dd>
          </div>
        ))}
      </dl>
      <Notice tone="info" title="More admin tools are on the way" className="mt-8">
        Moderation, verification review, the content editor, media, site settings and plan management arrive in the next releases.
        Until then, content and settings live in the Supabase tables described in the README.
      </Notice>
    </>
  );
}

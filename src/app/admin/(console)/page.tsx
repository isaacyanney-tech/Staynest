import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { AdminPageHeader } from "@/components/admin/page-header";
import { RecentActivity } from "@/components/admin/recent-activity";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminHomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const viewer = await requireRole(["admin"], "admin");
  const supabase = await createClient();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [pending, published, verifications, students, owners] = await Promise.all([
    count(supabase.from("hostels").select("id", { count: "exact", head: true }).eq("status", "pending_review")),
    count(supabase.from("hostels").select("id", { count: "exact", head: true }).eq("status", "published").eq("is_demo", false)),
    count(supabase.from("verification_applications").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student")),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner")),
  ]);
  const queues = [
    { label: "Listings waiting for review", value: pending, href: "/admin/listings" },
    { label: "Verification requests to review", value: verifications, href: "/admin/verification" },
  ];
  const stats = [
    { label: "Published listings", value: published, href: "/admin/listings?status=published" },
    { label: "Students", value: students, href: "/admin/users?role=student" },
    { label: "Owners", value: owners, href: "/admin/users?role=owner" },
  ];
  const firstName = viewer.fullName.split(" ")[0];

  return (
    <>
      <AdminPageHeader title="Overview" description={firstName ? `Signed in as ${firstName}.` : `Signed in as ${viewer.email}.`} />
      <section aria-labelledby="queues-heading" className="mt-8">
        <h2 id="queues-heading" className="sr-only">
          Waiting for you
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {queues.map((q) => (
            <Link
              key={q.label}
              href={q.href}
              className="group flex items-center justify-between rounded-lg border border-line bg-surface p-5 transition-colors hover:border-brand"
            >
              <span>
                <span className="block text-sm text-muted">{q.label}</span>
                <span className="mt-1 block font-display text-4xl font-semibold text-brand">{q.value}</span>
              </span>
              <ArrowRight className="size-5 text-ink/50 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
            </Link>
          ))}
        </div>
      </section>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-surface p-4">
            <dt className="text-sm text-muted">
              <Link href={s.href} className="hover:text-brand hover:underline">
                {s.label}
              </Link>
            </dt>
            <dd className="mt-1 font-display text-2xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby="activity-heading" className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 id="activity-heading" className="text-xl font-semibold">
            Recent activity
          </h2>
          <Link href="/admin/activity" className="text-sm font-medium text-brand hover:underline">
            Full activity log
          </Link>
        </div>
        <RecentActivity limit={8} />
      </section>
    </>
  );
}

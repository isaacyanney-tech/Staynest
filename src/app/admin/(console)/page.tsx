import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, Building2, ClipboardList, GraduationCap, House, Star } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader, DashboardSkeleton } from "@/components/dashboard/shell";
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
  const [pending, published, verifications, students, owners, ratings, hiddenRatings] = await Promise.all([
    count(supabase.from("hostels").select("id", { count: "exact", head: true }).eq("status", "pending_review")),
    count(supabase.from("hostels").select("id", { count: "exact", head: true }).eq("status", "published").eq("is_demo", false)),
    count(supabase.from("verification_applications").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student")),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner")),
    count(supabase.from("hostel_ratings").select("id", { count: "exact", head: true })),
    count(supabase.from("hostel_ratings").select("id", { count: "exact", head: true }).eq("is_hidden", true)),
  ]);
  const waiting = pending + verifications;
  const stats = [
    { label: "Students", value: students, icon: GraduationCap, href: "/admin/users?role=student" },
    { label: "Owners", value: owners, icon: House, href: "/admin/users?role=owner" },
    {
      label: "Student ratings",
      value: ratings,
      hint: hiddenRatings ? `${hiddenRatings} hidden` : undefined,
      icon: Star,
      href: "/admin/ratings",
    },
  ];

  return (
    <>
      <DashboardHeader
        viewer={viewer}
        role="Administrator"
        title="Overview"
        showSignOut={false}
        subtitle={
          waiting ? `${waiting} item${waiting === 1 ? " is" : "s are"} waiting for a decision.` : "Nothing is waiting for review."
        }
        stats={[
          {
            label: "Listings waiting for review",
            value: pending,
            icon: ClipboardList,
            href: "/admin/listings",
            tone: pending ? "attention" : "default",
          },
          {
            label: "Verification requests to review",
            value: verifications,
            icon: BadgeCheck,
            href: "/admin/verification",
            tone: verifications ? "attention" : "default",
          },
          { label: "Published listings", value: published, icon: Building2, href: "/admin/listings?status=published" },
          ...stats.slice(2),
        ]}
      />
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {stats.slice(0, 2).map((s) => (
          <div
            key={s.label}
            className="spotlight relative rounded-xl border border-line bg-surface py-4 pl-[4.5rem] pr-4 transition-[border-color,translate] hover:-translate-y-0.5 hover:border-brand has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand"
          >
            <dt className="text-sm text-muted">
              <span
                className="absolute left-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg bg-sunken text-brand"
                aria-hidden
              >
                <s.icon className="size-5" />
              </span>
              <Link href={s.href} className="outline-none after:absolute after:inset-0 after:rounded-xl">
                {s.label}
              </Link>
            </dt>
            <dd className="font-display text-2xl font-semibold">{s.value}</dd>
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

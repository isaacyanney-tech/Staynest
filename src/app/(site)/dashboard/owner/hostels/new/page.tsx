import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getUniversities } from "@/lib/hostels/queries";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { HostelForm } from "@/components/owner/hostel-form";

export const metadata: Metadata = { title: "Add a hostel", robots: { index: false } };

export default function NewHostelPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <Link href="/dashboard/owner" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand">
        <ArrowLeft className="size-4" aria-hidden />
        Your hostels
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-brand">Add a hostel</h1>
      <p className="mt-2 max-w-prose text-muted">
        This creates a private draft. Next you will add room types, prices and photos, then send the listing to us for review. Nothing is public until
        we approve it.
      </p>
      <div className="mt-8 rounded-lg border border-line bg-surface p-5 sm:p-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <NewHostel />
        </Suspense>
      </div>
    </div>
  );
}

async function NewHostel() {
  await requireRole(["owner"]);
  const universities = await getUniversities();
  return <HostelForm universities={universities} />;
}

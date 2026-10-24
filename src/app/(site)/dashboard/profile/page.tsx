import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { homeFor, requireRole } from "@/lib/auth";
import { DashboardHeader, DashboardSkeleton } from "@/components/dashboard/shell";
import { PasswordForm, ProfileForm } from "@/components/account/profile-forms";

export const metadata: Metadata = { title: "Profile and password", robots: { index: false } };

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <Profile />
      </Suspense>
    </div>
  );
}

const PHONE_HINT = {
  student: "Owners see it when you request an inspection, so they can call to arrange it.",
  owner: "For StayNest to reach you. Students see the contact number on each listing, which you set in the listing editor.",
  admin: "Only other administrators see it.",
} as const;

async function Profile() {
  const viewer = await requireRole(["student", "owner", "admin"]);
  const home = homeFor(viewer.role);
  return (
    <>
      <Link href={home} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> {viewer.role === "admin" ? "Admin console" : "Dashboard"}
      </Link>
      <div className="mt-3">
        <DashboardHeader viewer={viewer} title="Profile and password" />
      </div>

      <section aria-labelledby="details-heading" className="mt-8 rounded-lg border border-line bg-surface p-5 sm:p-6">
        <h2 id="details-heading" className="text-xl font-semibold">
          Your details
        </h2>
        <div className="mt-4">
          <ProfileForm fullName={viewer.fullName} phone={viewer.phone} email={viewer.email} phoneHint={PHONE_HINT[viewer.role]} />
        </div>
      </section>

      <section aria-labelledby="password-heading" className="mt-6 rounded-lg border border-line bg-surface p-5 sm:p-6">
        <h2 id="password-heading" className="text-xl font-semibold">
          Change password
        </h2>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </section>
    </>
  );
}

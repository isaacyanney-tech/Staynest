import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { safeNext } from "@/lib/safe-next";
import { AuthShell, AuthHeading } from "@/components/auth/auth-shell";
import { AdminSignInForm } from "@/components/auth/forms";
import { Skeleton } from "@/components/ui/states";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <AuthShell>
      <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-secondary-ink">
        <ShieldCheck className="size-4" aria-hidden />
        Administrators only
      </p>
      <AuthHeading title="Admin sign in" />
      <Suspense fallback={<Skeleton className="h-56" />}>
        <Form searchParams={searchParams} />
      </Suspense>
      <p className="mt-6 text-sm text-muted">Admin accounts are created by an existing administrator, or with the bootstrap script for the first one.</p>
    </AuthShell>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  return <AdminSignInForm next={next?.startsWith("/admin") ? next : undefined} />;
}

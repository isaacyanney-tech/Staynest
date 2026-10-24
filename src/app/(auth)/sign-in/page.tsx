import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { safeNext } from "@/lib/safe-next";
import { redirectIfSignedIn } from "@/lib/auth";
import { AuthHeading } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/forms";
import { Notice, Skeleton } from "@/components/ui/states";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <>
      <AuthHeading title="Welcome back">Sign in to see saved hostels and inspection requests.</AuthHeading>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Form searchParams={searchParams} />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted">
        New to StayNest?{" "}
        <Link href="/sign-up" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null) ?? undefined;
  await redirectIfSignedIn(next ?? null);
  return (
    <>
      {sp.error === "link" && (
        <Notice tone="warning" className="mb-4">
          That link has expired or was already used. Sign in, or request a new link.
        </Notice>
      )}
      <SignInForm next={next} />
    </>
  );
}

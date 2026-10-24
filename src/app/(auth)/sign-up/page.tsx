import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { safeNext } from "@/lib/safe-next";
import { redirectIfSignedIn } from "@/lib/auth";
import { AuthHeading } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/forms";
import { Skeleton } from "@/components/ui/states";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  return (
    <>
      <AuthHeading title="Create your account">Free for students. Owners start on the free plan.</AuthHeading>
      <Suspense fallback={<Skeleton className="h-[30rem]" />}>
        <Form searchParams={searchParams} />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/sign-up">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null) ?? undefined;
  await redirectIfSignedIn(next ?? null);
  return <SignUpForm next={next} initialRole={sp.role === "owner" ? "owner" : "student"} />;
}

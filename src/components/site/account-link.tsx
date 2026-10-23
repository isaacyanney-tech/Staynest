import Link from "next/link";
import { getViewer, homeFor } from "@/lib/auth";
import { buttonClass } from "@/components/ui/button";

/** Reads the session, so it must render inside a Suspense boundary. */
export async function AccountLinks({ stacked = false }: { stacked?: boolean }) {
  const viewer = await getViewer();
  if (viewer) {
    return (
      <div className={stacked ? "grid gap-2" : "flex items-center gap-2"}>
        <Link href={homeFor(viewer.role)} className={buttonClass("primary", "sm", stacked ? "h-11 w-full" : "")}>
          {viewer.role === "admin" ? "Admin" : "Dashboard"}
        </Link>
      </div>
    );
  }
  return (
    <div className={stacked ? "grid gap-2" : "flex items-center gap-2"}>
      <Link href="/sign-in" className={buttonClass("ghost", "sm", stacked ? "h-11 w-full border border-line" : "")}>
        Sign in
      </Link>
      <Link href="/sign-up" className={buttonClass("primary", "sm", stacked ? "h-11 w-full" : "")}>
        Create account
      </Link>
    </div>
  );
}

export function AccountLinksFallback() {
  return <div aria-hidden className="h-8 w-40" />;
}

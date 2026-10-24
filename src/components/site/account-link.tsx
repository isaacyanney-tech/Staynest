import Link from "next/link";
import { getViewer, homeFor, type Viewer } from "@/lib/auth";
import { buttonClass } from "@/components/ui/button";
import { AccountActions, AccountMenu, type AccountLink } from "./account-menu";

function linksFor(viewer: Viewer): AccountLink[] {
  const links: AccountLink[] = [{ href: homeFor(viewer.role), label: viewer.role === "admin" ? "Admin console" : "Dashboard" }];
  if (viewer.role === "owner") links.push({ href: "/dashboard/owner/billing", label: "Plan and billing" });
  links.push({ href: "/dashboard/profile", label: "Profile and password" });
  return links;
}

/** Reads the session, so it must render inside a Suspense boundary. */
export async function AccountLinks({ stacked = false }: { stacked?: boolean }) {
  const viewer = await getViewer();
  if (viewer) {
    if (stacked) {
      return (
        <div className="rounded-lg border border-line px-4 pt-3">
          <p className="text-sm text-ink/70">
            Signed in as <span className="font-semibold text-ink">{viewer.fullName || viewer.email}</span>
          </p>
          <AccountActions links={linksFor(viewer)} stacked />
        </div>
      );
    }
    return <AccountMenu name={viewer.fullName} email={viewer.email} links={linksFor(viewer)} />;
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
  return <div aria-hidden className="h-10 w-40" />;
}

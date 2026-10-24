import Link from "next/link";
import { Suspense } from "react";
import { getNavigation, getSiteSettings } from "@/lib/cms/queries";
import { Wordmark } from "./logo";
import { NavLinks, NavList } from "./nav-links";
import { MobileNav } from "./mobile-nav";
import { AccountLinks, AccountLinksFallback } from "./account-link";
import { ColorModeToggle } from "./color-mode-toggle";

export async function SiteHeader() {
  const [nav, settings] = await Promise.all([getNavigation(), getSiteSettings()]);
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-surface/92 backdrop-blur-sm supports-[backdrop-filter]:bg-surface/85">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded-md" aria-label={`${settings?.site_name ?? "StayNest"} home`}>
          <Wordmark name={settings?.site_name} logoUrl={settings?.logoUrl} />
        </Link>
        <nav aria-label="Main" className="hidden flex-1 md:block">
          <Suspense fallback={<NavList items={nav.header} pathname={null} />}>
            <NavLinks items={nav.header} />
          </Suspense>
        </nav>
        <div className="hidden items-center gap-1 md:flex">
          <ColorModeToggle />
          <Suspense fallback={<AccountLinksFallback />}>
            <AccountLinks />
          </Suspense>
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <ColorModeToggle />
          <MobileNav
          items={nav.header}
          account={
            <Suspense fallback={<AccountLinksFallback />}>
              <AccountLinks stacked />
            </Suspense>
          }
          />
        </div>
      </div>
    </header>
  );
}

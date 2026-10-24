import type React from "react";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Wordmark } from "@/components/site/logo";
import { AdminNav, AdminNavList } from "@/components/admin/admin-nav";
import { ColorModeToggle } from "@/components/site/color-mode-toggle";
import { PendingButton } from "@/components/ui/submit-button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="rounded-md">
              <Wordmark />
              <span className="sr-only">Admin overview</span>
            </Link>
            <span className="rounded-sm bg-primary px-1.5 py-0.5 text-xs font-medium text-white">Admin</span>
          </div>
          <div className="flex items-center gap-1">
            <ColorModeToggle />
            <Link href="/" className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-ink/75 hover:text-brand">
              <span className="sr-only sm:not-sr-only">View site</span>
              <ExternalLink className="size-4 sm:size-3.5" aria-hidden />
            </Link>
            <form action={signOut}>
              <PendingButton className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-ink/75 hover:bg-sunken hover:text-ink">
                <LogOut className="size-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">Sign out</span>
              </PendingButton>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-10">
        <nav aria-label="Admin" className="-mx-4 border-b border-line px-4 py-2 sm:-mx-6 sm:px-6 lg:sticky lg:top-0 lg:mx-0 lg:self-start lg:border-b-0 lg:px-0 lg:py-8">
          <Suspense fallback={<AdminNavList />}>
            <AdminNav />
          </Suspense>
        </nav>
        <main id="main" className="min-w-0 pb-20 pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}

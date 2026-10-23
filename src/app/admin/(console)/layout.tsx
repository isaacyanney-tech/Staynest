import type React from "react";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { Wordmark } from "@/components/site/logo";
import { AdminNav, AdminNavList } from "@/components/admin/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="rounded-md">
              <Wordmark />
              <span className="sr-only">Admin overview</span>
            </Link>
            <span className="rounded-sm bg-primary px-1.5 py-0.5 text-xs font-medium text-white">Admin</span>
          </div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/75 hover:text-primary">
            View site
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
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

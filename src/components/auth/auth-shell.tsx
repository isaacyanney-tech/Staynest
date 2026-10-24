import Link from "next/link";
import type { ReactNode } from "react";
import { getSiteSettings } from "@/lib/cms/queries";
import { LogoMark, Wordmark } from "@/components/site/logo";

/** Two-column frame for sign-in and sign-up screens. */
export async function AuthShell({ children }: { children: ReactNode }) {
  const settings = await getSiteSettings();
  const name = settings?.site_name ?? "StayNest";
  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-[1fr_minmax(0,34rem)]">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <Link href="/" className="self-start rounded-md">
          <Wordmark name={name} logoUrl={settings?.logoUrl} />
          <span className="sr-only">Home</span>
        </Link>
        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm animate-fade-up">{children}</div>
        </main>
      </div>
      <aside aria-hidden className="hero-band relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <div className="mb-auto mt-16 flex size-24 items-center justify-center rounded-2xl bg-surface shadow-overlay">
            <LogoMark className="size-16" />
          </div>
          {settings?.tagline && <p className="max-w-sm font-display text-3xl font-semibold leading-tight tracking-tight">{settings.tagline}</p>}
          <p className="mt-4 max-w-sm text-white/70">Search near campus, compare real prices and book an inspection before you pay.</p>
        </div>
      </aside>
    </div>
  );
}

export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-[1.75rem] font-semibold tracking-tight text-brand">{title}</h1>
      {children && <p className="mt-2 text-[0.9375rem] text-muted">{children}</p>}
    </div>
  );
}

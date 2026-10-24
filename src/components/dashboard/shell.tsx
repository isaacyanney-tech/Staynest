import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, LogOut, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/actions/auth";
import type { Viewer } from "@/lib/auth";
import { PendingButton } from "@/components/ui/submit-button";

export type DashboardStat = {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  icon?: LucideIcon;
  tone?: "default" | "attention";
};

/** Time-of-day greeting. StayNest serves Ghana, which keeps GMT all year. */
export function greeting(now = new Date()) {
  const h = now.getUTCHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/**
 * The band at the top of every dashboard: who is signed in, the page title,
 * the main actions and a row of figures that link to the work behind them.
 */
export function DashboardHeader({
  viewer,
  title,
  role,
  subtitle,
  stats,
  showSignOut = true,
  children,
}: {
  viewer: Viewer;
  title: string;
  role?: string;
  subtitle?: ReactNode;
  stats?: DashboardStat[];
  /** The admin console has its own sign-out button in the top bar. */
  showSignOut?: boolean;
  children?: ReactNode;
}) {
  const firstName = viewer.fullName.split(" ")[0];
  return (
    <header className="hero-band dashboard-hero relative isolate overflow-hidden rounded-2xl px-5 pb-6 pt-6 text-white shadow-overlay sm:px-8 sm:pt-8">
      <div aria-hidden className="dashboard-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 animate-fade-up">
          <p className="flex flex-wrap items-center gap-2 text-sm text-white/75">
            {role && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-0.5 text-xs font-medium text-white/90">
                <span className="size-1.5 rounded-full bg-secondary" aria-hidden />
                {role}
              </span>
            )}
            <span>{firstName ? `${greeting()}, ${firstName}. Signed in as ${firstName}` : `Signed in as ${viewer.email}`}</span>
          </p>
          <h1 className="hero-title mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-[0.9375rem] text-white/75">{subtitle}</p>}
        </div>
        <div className="dashboard-actions flex flex-wrap items-center gap-2">
          {children}
          {showSignOut && (
            <form action={signOut}>
              <PendingButton className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                <LogOut className="size-4" aria-hidden />
                Sign out
              </PendingButton>
            </form>
          )}
        </div>
      </div>
      {stats && stats.length > 0 && (
        <dl className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s, i) => (
            <StatTile key={s.label} stat={s} index={i} />
          ))}
        </dl>
      )}
    </header>
  );
}

function StatTile({ stat, index }: { stat: DashboardStat; index: number }) {
  const Icon = stat.icon;
  return (
    <div
      className={cn(
        "stat-tile group relative h-full animate-fade-up rounded-xl border p-4 backdrop-blur-sm transition-[translate,background-color,border-color] duration-300 ease-out",
        stat.tone === "attention" ? "border-secondary/60 bg-secondary/[0.14]" : "border-white/12 bg-white/[0.06]",
        stat.href &&
          "hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.1] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-white",
      )}
      style={{ animationDelay: `${120 + index * 70}ms` }}
    >
      <dt className="flex items-center gap-1.5 pr-5 text-sm text-white/75">
        {Icon && <Icon className="size-4 shrink-0 text-secondary" aria-hidden />}
        {stat.href ? (
          // The link covers the whole tile; the figure stays in the description.
          <Link href={stat.href} className="outline-none after:absolute after:inset-0 after:rounded-xl">
            {stat.label}
          </Link>
        ) : (
          stat.label
        )}
      </dt>
      <dd className="mt-1.5 font-display text-3xl font-semibold tracking-tight">{stat.value}</dd>
      {stat.hint && <dd className="mt-0.5 text-xs text-white/70">{stat.hint}</dd>}
      {stat.href && (
        <ArrowUpRight
          className="absolute right-3 top-3 size-4 text-white/40 transition-[translate,color] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
          aria-hidden
        />
      )}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton h-56 rounded-2xl" />
      <div className="skeleton mt-10 h-48 rounded-lg" />
      <div className="skeleton mt-6 h-48 rounded-lg" />
    </div>
  );
}

export const STATUS_TONE = {
  requested: "info",
  accepted: "success",
  rescheduled: "warning",
  declined: "danger",
  completed: "neutral",
  cancelled: "neutral",
} as const;

export const STATUS_LABEL = {
  requested: "Waiting for owner",
  accepted: "Accepted",
  rescheduled: "New date proposed",
  declined: "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;

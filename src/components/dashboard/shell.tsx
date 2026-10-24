import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import type { Viewer } from "@/lib/auth";

export function DashboardHeader({ viewer, title, children }: { viewer: Viewer; title: string; children?: ReactNode }) {
  const firstName = viewer.fullName.split(" ")[0];
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        <p className="text-sm text-muted">{firstName ? `Signed in as ${firstName}` : viewer.email}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {children}
        <form action={signOut}>
          <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted hover:bg-sunken hover:text-ink">
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton h-4 w-32 rounded" />
      <div className="skeleton mt-3 h-9 w-64 rounded" />
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

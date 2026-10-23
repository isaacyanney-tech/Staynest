import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/admin/queries";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SettingForm } from "@/components/admin/setting-form";

export const metadata: Metadata = { title: "Business settings · Admin", robots: { index: false, follow: false } };

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="Business settings"
        description="Fees, limits and switches the site reads at run time. Each one is saved and logged on its own."
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  await requireRole(["admin"], "admin");
  const settings = await getBusinessSettings();
  if (settings.length === 0) return <EmptyState className="mt-6" title="No settings yet" />;
  return (
    <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
      {settings.map((s) => (
        <li key={s.key} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-6">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 font-semibold">
              {s.label}
              {s.is_public ? <Badge tone="info">Shown on the site</Badge> : <Badge>Internal</Badge>}
            </p>
            {s.description && <p className="mt-0.5 text-sm text-ink/75">{s.description}</p>}
            <p className="mt-1 text-xs text-ink/70">
              <code className="font-mono">{s.key}</code> · updated {formatDate(s.updated_at)}
            </p>
          </div>
          {s.value !== null && typeof s.value === "object" ? (
            <p className="text-sm text-ink/75">This setting holds structured data and can only be changed in the database.</p>
          ) : (
            <SettingForm settingKey={s.key} label={s.label} value={s.value} />
          )}
        </li>
      ))}
    </ul>
  );
}

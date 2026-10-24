import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getSiteAdmin } from "@/lib/admin/content";
import { arrangeNavItem, deleteBanner } from "@/lib/actions/site";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/states";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { AdminPageHeader } from "@/components/admin/page-header";
import { BannerForm, NavItemForm, SiteSettingsForms } from "@/components/admin/site-forms";
import { PendingButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { title: "Site and navigation · Admin", robots: { index: false, follow: false } };

export default function AdminSitePage() {
  return (
    <>
      <AdminPageHeader title="Site and navigation" description="The name, colours, contact details, menus and announcement banner used across the whole site. Changes go live when saved." />
      <Suspense fallback={<DashboardSkeleton />}>
        <Site />
      </Suspense>
    </>
  );
}

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {});

async function Site() {
  await requireRole(["admin"], "admin");
  const { settings, header, footer, banners, media } = await getSiteAdmin();
  if (!settings) return <Notice tone="danger" className="mt-6">Site settings are missing from the database.</Notice>;
  const now = new Date().toISOString();
  return (
    <div className="mt-6 space-y-10">
      <SiteSettingsForms
        settings={{
          site_name: settings.site_name,
          tagline: settings.tagline,
          logo_media_id: settings.logo_media_id,
          favicon_media_id: settings.favicon_media_id,
          theme: obj(settings.theme),
          contact: obj(settings.contact),
          social: obj(settings.social),
          seo: obj(settings.seo),
        }}
        media={media}
      />

      {(["header", "footer"] as const).map((location) => {
        const items = location === "header" ? header : footer;
        return (
          <section key={location} aria-labelledby={`nav-${location}`}>
            <h2 id={`nav-${location}`} className="text-xl font-semibold">
              {location === "header" ? "Top menu" : "Footer links"}
            </h2>
            <p className="mt-1 text-sm text-ink/75">
              {location === "header" ? "Links across the top of every page, in this order." : "Grouped into columns by the column name, in this order."}
            </p>
            <ol className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
              {items.map((item, i) => (
                <li key={item.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto]">
                  <NavItemForm item={item} location={location} />
                  <form action={arrangeNavItem} className="flex gap-1 md:self-end">
                    <input type="hidden" name="id" value={item.id} />
                    <SmallButton op="up" label={`Move ${item.label} up`} disabled={i === 0}>
                      <ArrowUp className="size-4" aria-hidden />
                    </SmallButton>
                    <SmallButton op="down" label={`Move ${item.label} down`} disabled={i === items.length - 1}>
                      <ArrowDown className="size-4" aria-hidden />
                    </SmallButton>
                    <SmallButton op="delete" label={`Delete ${item.label}`} danger>
                      <Trash2 className="size-4" aria-hidden />
                    </SmallButton>
                  </form>
                </li>
              ))}
              <li className="bg-sunken/50 p-4">
                <h3 className="mb-3 text-sm font-semibold">Add a link</h3>
                <NavItemForm location={location} />
              </li>
            </ol>
          </section>
        );
      })}

      <section aria-labelledby="banners-heading">
        <h2 id="banners-heading" className="text-xl font-semibold">
          Announcement banner
        </h2>
        <p className="mt-1 text-sm text-ink/75">A strip above the menu on every page. If several are live at once, only the first one shows.</p>
        <ul className="mt-3 space-y-3">
          {banners.map((b) => {
            const live = b.is_active && (!b.starts_at || b.starts_at <= now) && (!b.ends_at || b.ends_at > now);
            return (
              <li key={b.id} className="rounded-lg border border-line bg-surface p-4">
                <p className="mb-3 flex flex-wrap items-center gap-2">
                  {live ? <Badge tone="success">Showing now</Badge> : b.is_active ? <Badge tone="info">Scheduled or ended</Badge> : <Badge>Switched off</Badge>}
                </p>
                <BannerForm banner={b} />
                <form action={deleteBanner} className="mt-3 border-t border-line pt-3">
                  <input type="hidden" name="id" value={b.id} />
                  <PendingButton className="text-sm font-medium text-danger hover:underline">
                    Delete banner
                  </PendingButton>
                </form>
              </li>
            );
          })}
          <li className="rounded-lg border border-dashed border-line-strong bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold">New banner</h3>
            <BannerForm />
          </li>
        </ul>
      </section>
    </div>
  );
}

function SmallButton({ op, label, disabled, danger, children }: { op: string; label: string; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <PendingButton
      name="op"
      value={op}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={
        danger
          ? "inline-flex size-9 items-center justify-center rounded-md border border-line text-danger hover:border-danger hover:bg-danger-soft"
          : "inline-flex size-9 items-center justify-center rounded-md border border-line text-ink/75 hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40"
      }
    >
      {children}
    </PendingButton>
  );
}

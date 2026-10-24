import Link from "next/link";
import { cacheLife } from "next/cache";
import { findSection, getNavigation, getPage, getSiteSettings } from "@/lib/cms/queries";
import type { SectionContent } from "@/lib/cms/schemas";
import { Wordmark } from "./logo";

/** `preview` replaces the published footer text, for the admin preview. */
export async function SiteFooter({ preview }: { preview?: SectionContent<"footer"> | null } = {}) {
  const [nav, settings, global] = await Promise.all([getNavigation(), getSiteSettings(), getPage("global")]);
  const footer = preview !== undefined ? preview : global ? findSection(global.sections, "footer") : null;
  const groups = new Map<string, typeof nav.footer>();
  for (const item of nav.footer) {
    const key = item.group_label ?? "";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const contact = (settings?.contact ?? {}) as Record<string, string>;
  const social = Object.entries((settings?.social ?? {}) as Record<string, string>).filter(([, v]) => v?.startsWith("https://"));
  const year = await currentYear();

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm space-y-4">
          <Wordmark name={settings?.site_name} logoUrl={settings?.logoUrl} />
          {footer?.blurb && <p className="text-[0.9375rem] text-muted">{footer.blurb}</p>}
          <address className="space-y-1 text-sm not-italic text-muted">
            {contact.email && (
              <p>
                <a className="hover:text-brand" href={`mailto:${contact.email}`}>{contact.email}</a>
              </p>
            )}
            {contact.phone && <p>{contact.phone}</p>}
            {contact.address && <p>{contact.address}</p>}
          </address>
        </div>
        {[...groups.entries()].map(([group, items]) => (
          <div key={group}>
            {group && <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-muted">{group}</h2>}
            <ul className="mt-4 space-y-2.5">
              {items.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="text-[0.9375rem] text-ink/85 hover:text-brand">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {settings?.site_name ?? "StayNest"}. {footer?.legal}
          </p>
          {social.length > 0 && (
            <ul className="flex gap-4">
              {social.map(([name, href]) => (
                <li key={name}>
                  <a href={href} rel="noopener noreferrer" target="_blank" className="capitalize hover:text-brand">
                    {name === "x" ? "X" : name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

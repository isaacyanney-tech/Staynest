import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getPage, getSiteSettings, type PublishedSection } from "@/lib/cms/queries";
import { formatDate } from "@/lib/format";
import { RichText } from "./rich-text";

/** Metadata for a CMS page, from the page's SEO fields. */
export async function cmsMetadata(slug: string): Promise<Metadata> {
  const page = await getPage(slug);
  if (!page) return {};
  return { title: page.seo_title || page.title, description: page.seo_description ?? undefined };
}

/** Renders a simple content page (about, FAQ, contact, legal) from published CMS sections. */
export async function CmsPage({ slug }: { slug: string }) {
  const page = await getPage(slug);
  if (!page) notFound();
  return <CmsSections slug={slug} sections={page.sections} updatedAt={page.updated_at} />;
}

/** The body of a content page; the admin preview passes draft sections. */
export async function CmsSections({ slug, sections, updatedAt }: { slug: string; sections: PublishedSection[]; updatedAt: string }) {
  const settings = slug === "contact" ? await getSiteSettings() : null;
  const legal = slug === "terms" || slug === "privacy";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6 md:pt-14">
      {sections.map((section, i) => (
        <Section key={section.id} section={section} first={i === 0} contact={(settings?.contact ?? null) as Record<string, string> | null} />
      ))}
      {legal && <p className="mt-12 border-t border-line pt-6 text-sm text-muted">Last updated {formatDate(updatedAt)}.</p>}
    </div>
  );
}

function Heading({ first, children }: { first: boolean; children: React.ReactNode }) {
  return first ? (
    <h1 className="text-3xl font-semibold tracking-tight text-brand md:text-[2.75rem] md:leading-tight">{children}</h1>
  ) : (
    <h2 className="mt-14 text-2xl font-semibold text-brand">{children}</h2>
  );
}

function Section({ section, first, contact }: { section: PublishedSection; first: boolean; contact: Record<string, string> | null }) {
  switch (section.type) {
    case "rich_text":
    case "about":
      return (
        <section>
          <Heading first={first}>{section.content.heading}</Heading>
          <div className="mt-6">
            <RichText source={section.content.body} />
          </div>
        </section>
      );
    case "faq":
      return (
        <section>
          <Heading first={first}>{section.content.heading}</Heading>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {section.content.items.map((item) => (
              <details key={item.q} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-[1.0625rem] font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span aria-hidden className="relative size-4 shrink-0 text-muted">
                    <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-current" />
                    <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded bg-current transition-transform duration-200 group-open:scale-y-0" />
                  </span>
                </summary>
                <div className="pb-5 pr-8">
                  <RichText source={item.a} />
                </div>
              </details>
            ))}
          </div>
        </section>
      );
    case "contact":
      return (
        <section>
          <Heading first={first}>{section.content.heading}</Heading>
          {section.content.body && <p className="mt-4 text-lg leading-relaxed text-muted">{section.content.body}</p>}
          {contact && (
            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              {contact.email && (
                <ContactItem icon={<Mail className="size-4" aria-hidden />} label="Email">
                  <a href={`mailto:${contact.email}`} className="font-medium text-brand hover:underline">
                    {contact.email}
                  </a>
                </ContactItem>
              )}
              {contact.phone && (
                <ContactItem icon={<Phone className="size-4" aria-hidden />} label="Phone">
                  <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="font-medium text-brand hover:underline">
                    {contact.phone}
                  </a>
                </ContactItem>
              )}
              {contact.address && (
                <ContactItem icon={<MapPin className="size-4" aria-hidden />} label="Address">
                  {contact.address}
                </ContactItem>
              )}
              {contact.hours && (
                <ContactItem icon={<Clock className="size-4" aria-hidden />} label="Opening hours">
                  {contact.hours}
                </ContactItem>
              )}
            </dl>
          )}
        </section>
      );
    default:
      return null;
  }
}

function ContactItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <dt className="flex items-center gap-2 text-sm text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

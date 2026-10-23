"use client";
import { useActionState, type ReactNode } from "react";
import { saveBanner, saveNavItem, saveSiteSettings } from "@/lib/actions/site";
import { idle } from "@/lib/forms";
import { PRIMARY_OPTIONS, SECONDARY_OPTIONS } from "@/lib/theme";
import type { SiteGroup } from "@/lib/admin/schemas";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

type Errors = Record<string, string[] | undefined>;
type Values = Record<string, string> | undefined;
type MediaOption = { id: string; alt: string };

function GroupForm({ group, title, description, children }: { group: SiteGroup; title: string; description?: string; children: (v: Values, err: Errors) => ReactNode }) {
  const [state, action] = useActionState(saveSiteSettings, idle);
  const v = state.status === "error" ? state.values : undefined;
  return (
    <section aria-labelledby={`site-${group}`} className="rounded-lg border border-line bg-surface p-5">
      <h2 id={`site-${group}`} className="text-lg font-semibold">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-ink/75">{description}</p>}
      <form action={action} className="mt-4 space-y-4" noValidate>
        <input type="hidden" name="group" value={group} />
        <FormMessage state={state} />
        {children(v, state.fieldErrors ?? {})}
        <SubmitButton variant="outline" pendingLabel="Saving…">
          Save {title.toLowerCase()}
        </SubmitButton>
      </form>
    </section>
  );
}

type Settings = {
  site_name: string;
  tagline: string;
  logo_media_id: string | null;
  favicon_media_id: string | null;
  theme: Record<string, string>;
  contact: Record<string, string>;
  social: Record<string, string>;
  seo: Record<string, string>;
};

export function SiteSettingsForms({ settings, media }: { settings: Settings; media: MediaOption[] }) {
  const mediaSelect = (name: "logo_media_id" | "favicon_media_id", label: string, hint: string, v: Values, err: Errors) => (
    <Field label={label} name={name} idPrefix="site-" optional hint={hint} error={err[name]}>
      {(p) => (
        <Select {...p} name={name} defaultValue={v?.[name] ?? settings[name] ?? ""}>
          <option value="">Use the built-in one</option>
          {media.map((m) => (
            <option key={m.id} value={m.id}>
              {m.alt || "Untitled image"}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
  const text = (group: keyof Settings, name: string, label: string, v: Values, err: Errors, extra: { hint?: string; max?: number; type?: string } = {}) => (
    <Field label={label} name={name} idPrefix={`site-${group}-`} optional hint={extra.hint} error={err[name]}>
      {(p) => {
        const stored = settings[group];
        const current = typeof stored === "object" && stored !== null ? (stored as Record<string, string>)[name] : undefined;
        return <Input {...p} name={name} type={extra.type ?? "text"} maxLength={extra.max ?? 200} defaultValue={v?.[name] ?? current ?? ""} />;
      }}
    </Field>
  );

  return (
    <div className="space-y-6">
      <GroupForm group="identity" title="Name and logo">
        {(v, err) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Site name" name="site_name" idPrefix="site-" error={err.site_name}>
                {(p) => <Input {...p} name="site_name" maxLength={60} defaultValue={v?.site_name ?? settings.site_name} />}
              </Field>
              <Field label="Tagline" name="tagline" idPrefix="site-" optional error={err.tagline}>
                {(p) => <Input {...p} name="tagline" maxLength={160} defaultValue={v?.tagline ?? settings.tagline} />}
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {mediaSelect("logo_media_id", "Logo", "A wide image with a transparent background works best. Upload it in the media library first.", v, err)}
              {mediaSelect("favicon_media_id", "Browser tab icon", "A square image, at least 64 × 64 pixels.", v, err)}
            </div>
          </>
        )}
      </GroupForm>

      <GroupForm group="theme" title="Colours" description="Only combinations that keep text readable are offered.">
        {(v, err) => (
          <div className="grid gap-6 sm:grid-cols-2">
            <Swatches name="primary" legend="Main colour" options={PRIMARY_OPTIONS} current={v?.primary ?? settings.theme.primary} error={err.primary?.[0]} />
            <Swatches name="secondary" legend="Accent colour" options={SECONDARY_OPTIONS} current={v?.secondary ?? settings.theme.secondary} error={err.secondary?.[0]} />
          </div>
        )}
      </GroupForm>

      <GroupForm group="contact" title="Contact details" description="Shown on the contact page and in the footer. Leave a field blank to hide it.">
        {(v, err) => (
          <div className="grid gap-4 sm:grid-cols-2">
            {text("contact", "email", "Email", v, err, { type: "email" })}
            {text("contact", "phone", "Phone", v, err, { max: 40 })}
            {text("contact", "address", "Address", v, err)}
            {text("contact", "hours", "Opening hours", v, err, { max: 100 })}
          </div>
        )}
      </GroupForm>

      <GroupForm group="social" title="Social links" description="Full links starting with https://. Blank links are not shown.">
        {(v, err) => (
          <div className="grid gap-4 sm:grid-cols-2">
            {text("social", "facebook", "Facebook", v, err, { max: 300 })}
            {text("social", "instagram", "Instagram", v, err, { max: 300 })}
            {text("social", "x", "X", v, err, { max: 300 })}
            {text("social", "tiktok", "TikTok", v, err, { max: 300 })}
          </div>
        )}
      </GroupForm>

      <GroupForm group="seo" title="Search defaults" description="Used for pages that do not set their own search title and description.">
        {(v, err) => (
          <>
            {text("seo", "title", "Default search title", v, err, { max: 70, hint: "Up to 70 characters." })}
            <Field label="Default search description" name="description" idPrefix="site-seo-" optional hint="Up to 170 characters." error={err.description}>
              {(p) => <Textarea {...p} name="description" rows={3} maxLength={170} defaultValue={v?.description ?? settings.seo.description ?? ""} />}
            </Field>
          </>
        )}
      </GroupForm>
    </div>
  );
}

function Swatches({ name, legend, options, current, error }: { name: string; legend: string; options: Record<string, { label: string }>; current?: string; error?: string }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 space-y-2">
        {Object.entries(options).map(([hex, o]) => (
          <label key={hex} className="flex cursor-pointer items-center gap-3 rounded-md border border-line-strong p-2.5 has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/25">
            <input type="radio" name={name} value={hex} defaultChecked={current === hex} className="accent-[var(--brand-primary)]" />
            <span aria-hidden className="size-6 rounded-sm border border-black/10" style={{ background: hex }} />
            <span className="text-sm">{o.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-[0.8125rem] font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

// ------------------------------------------------------------------ navigation

export function NavItemForm({ item, location }: { item?: { id: string; group_label: string | null; label: string; href: string; is_visible: boolean }; location: "header" | "footer" }) {
  const [state, action] = useActionState(saveNavItem, idle);
  const err = state.fieldErrors ?? {};
  const v = state.status === "error" ? state.values : undefined;
  const prefix = `nav-${item?.id ?? `new-${location}`}-`;
  return (
    <form action={action} className="space-y-3" noValidate aria-label={item ? `Edit link ${item.label}` : `Add a ${location} link`}>
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <input type="hidden" name="location" value={location} />
      <FormMessage state={state} />
      <div className={location === "footer" ? "grid gap-3 sm:grid-cols-3" : "grid gap-3 sm:grid-cols-2"}>
        <Field label="Link text" name="label" idPrefix={prefix} error={err.label}>
          {(p) => <Input {...p} name="label" maxLength={40} defaultValue={v?.label ?? item?.label} />}
        </Field>
        <Field label="Goes to" name="href" idPrefix={prefix} error={err.href}>
          {(p) => <Input {...p} name="href" maxLength={300} placeholder="/hostels" defaultValue={v?.href ?? item?.href} />}
        </Field>
        {location === "footer" && (
          <Field label="Column" name="group_label" idPrefix={prefix} optional error={err.group_label}>
            {(p) => <Input {...p} name="group_label" maxLength={40} defaultValue={v?.group_label ?? item?.group_label ?? ""} />}
          </Field>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Checkbox name="is_visible" defaultChecked={v ? v.is_visible === "on" : (item?.is_visible ?? true)} label="Show this link" />
        <SubmitButton size="sm" variant={item ? "outline" : "primary"} pendingLabel="Saving…">
          {item ? "Save link" : "Add link"}
        </SubmitButton>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ banners

/** datetime-local value in UTC, which is also Ghana time. */
function localValue(iso: string | null | undefined) {
  return iso ? iso.slice(0, 16) : "";
}

export function BannerForm({
  banner,
}: {
  banner?: { id: string; message: string; link_label: string | null; link_href: string | null; tone: string; starts_at: string | null; ends_at: string | null; is_active: boolean };
}) {
  const [state, action] = useActionState(saveBanner, idle);
  const err = state.fieldErrors ?? {};
  const v = state.status === "error" ? state.values : undefined;
  const prefix = `banner-${banner?.id ?? "new"}-`;
  return (
    <form action={action} className="space-y-3" noValidate aria-label={banner ? "Edit banner" : "New banner"}>
      <input type="hidden" name="id" value={banner?.id ?? ""} />
      <FormMessage state={state} />
      <Field label="Message" name="message" idPrefix={prefix} error={err.message}>
        {(p) => <Input {...p} name="message" maxLength={160} defaultValue={v?.message ?? banner?.message} />}
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Link text" name="link_label" idPrefix={prefix} optional error={err.link_label}>
          {(p) => <Input {...p} name="link_label" maxLength={40} defaultValue={v?.link_label ?? banner?.link_label ?? ""} />}
        </Field>
        <Field label="Link goes to" name="link_href" idPrefix={prefix} optional error={err.link_href}>
          {(p) => <Input {...p} name="link_href" maxLength={300} defaultValue={v?.link_href ?? banner?.link_href ?? ""} />}
        </Field>
        <Field label="Style" name="tone" idPrefix={prefix} error={err.tone}>
          {(p) => (
            <Select {...p} name="tone" defaultValue={v?.tone ?? banner?.tone ?? "info"}>
              <option value="info">Information (main colour)</option>
              <option value="promo">Promotion (accent colour)</option>
              <option value="notice">Notice (amber)</option>
            </Select>
          )}
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Starts" name="starts_at" idPrefix={prefix} optional hint="Ghana time. Blank means straight away." error={err.starts_at}>
          {(p) => <Input {...p} name="starts_at" type="datetime-local" defaultValue={v?.starts_at ?? localValue(banner?.starts_at)} />}
        </Field>
        <Field label="Ends" name="ends_at" idPrefix={prefix} optional hint="Blank means until you switch it off." error={err.ends_at}>
          {(p) => <Input {...p} name="ends_at" type="datetime-local" defaultValue={v?.ends_at ?? localValue(banner?.ends_at)} />}
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Checkbox name="is_active" defaultChecked={v ? v.is_active === "on" : (banner?.is_active ?? false)} label="Switched on" />
        <SubmitButton size="sm" variant={banner ? "outline" : "primary"} pendingLabel="Saving…">
          {banner ? "Save banner" : "Add banner"}
        </SubmitButton>
      </div>
    </form>
  );
}

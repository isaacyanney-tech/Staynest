import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Tables } from "@/lib/supabase/database.types";
import { isSectionType, parseSection, type SectionContent, type SectionType } from "./schemas";

// Public CMS reads. Cached for about a minute and invalidated with updateTag()
// when an administrator publishes, so changes appear without a rebuild. The
// short lifetime bounds staleness on hosts that run several server instances.
export const CMS_TAG = "cms";

export type SiteSettings = Tables<"site_settings"> & { logoUrl: string | null; faviconUrl: string | null };

export type PublishedSection = {
  [T in SectionType]: { id: string; key: string; type: T; content: SectionContent<T> };
}[SectionType];

export async function getSiteSettings(): Promise<SiteSettings | null> {
  "use cache";
  cacheTag(CMS_TAG, "site-settings");
  cacheLife("minutes");
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return null;
  const ids = [data.logo_media_id, data.favicon_media_id].filter(Boolean) as string[];
  const media = ids.length ? await getMediaByIds(ids) : {};
  return {
    ...data,
    logoUrl: data.logo_media_id ? (media[data.logo_media_id]?.url ?? null) : null,
    faviconUrl: data.favicon_media_id ? (media[data.favicon_media_id]?.url ?? null) : null,
  };
}

export async function getPage(slug: string) {
  "use cache";
  cacheTag(CMS_TAG, `page:${slug}`);
  cacheLife("minutes");
  const supabase = createPublicClient();
  const { data: page } = await supabase
    .from("pages")
    .select("id, slug, title, seo_title, seo_description, updated_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!page) return null;
  const { data: rows } = await supabase
    .from("page_sections")
    .select("id, key, type, published, sort_order")
    .eq("page_id", page.id)
    .order("sort_order");
  const sections: PublishedSection[] = [];
  for (const row of rows ?? []) {
    if (!isSectionType(row.type)) continue;
    const content = parseSection(row.type, row.published);
    if (content) sections.push({ id: row.id, key: row.key, type: row.type, content } as PublishedSection);
  }
  return { ...page, sections };
}

export function findSection<T extends SectionType>(
  sections: PublishedSection[],
  type: T,
): SectionContent<T> | null {
  const s = sections.find((x) => x.type === type);
  return s ? (s.content as SectionContent<T>) : null;
}

export async function getNavigation() {
  "use cache";
  cacheTag(CMS_TAG, "navigation");
  cacheLife("minutes");
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("navigation_items")
    .select("id, location, group_label, label, href, sort_order")
    .order("sort_order");
  return {
    header: (data ?? []).filter((i) => i.location === "header"),
    footer: (data ?? []).filter((i) => i.location === "footer"),
  };
}

export async function getActiveBanners() {
  "use cache";
  cacheTag(CMS_TAG, "banners");
  cacheLife("minutes");
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("promo_banners")
    .select("id, message, link_label, link_href, tone")
    .order("sort_order");
  return data ?? [];
}

export type MediaRef = { url: string; alt: string; caption: string | null; credit: string | null; illustrative: boolean };

export async function getMediaByIds(ids: string[]): Promise<Record<string, MediaRef>> {
  "use cache";
  cacheTag(CMS_TAG, "media");
  cacheLife("minutes");
  if (ids.length === 0) return {};
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("media_assets")
    .select("id, bucket, storage_path, external_url, alt_text, caption, credit, is_illustrative")
    .in("id", ids);
  const out: Record<string, MediaRef> = {};
  for (const m of data ?? []) {
    const url = m.external_url ?? publicStorageUrl(m.bucket, m.storage_path!);
    out[m.id] = { url, alt: m.alt_text, caption: m.caption, credit: m.credit, illustrative: m.is_illustrative };
  }
  return out;
}

export async function getPublicSetting<T>(key: string, fallback: T): Promise<T> {
  "use cache";
  cacheTag(CMS_TAG, "business-settings");
  cacheLife("minutes");
  const supabase = createPublicClient();
  const { data } = await supabase.from("business_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T | undefined) ?? fallback;
}

export function publicStorageUrl(bucket: string, path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

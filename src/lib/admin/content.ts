import "server-only";
import { createClient } from "@/lib/supabase/server";
import { publicStorageUrl, type PublishedSection } from "@/lib/cms/queries";
import { isSectionType, parseSection } from "@/lib/cms/schemas";
import { sectionState } from "@/lib/cms/fields";

// Admin reads for the content editor. Drafts and revisions are visible only
// to administrators under row-level security.

async function sectionsWithDrafts(pageIds: string[]) {
  const supabase = await createClient();
  const { data: sections } = await supabase
    .from("page_sections")
    .select("id, page_id, key, type, label, sort_order, is_visible, published, published_at")
    .in("page_id", pageIds)
    .order("sort_order");
  const ids = (sections ?? []).map((s) => s.id);
  const { data: drafts } = ids.length
    ? await supabase.from("page_section_drafts").select("section_id, content, updated_at").in("section_id", ids)
    : { data: [] };
  const draftFor = new Map((drafts ?? []).map((d) => [d.section_id, d]));
  return (sections ?? []).map((s) => {
    const draft = draftFor.get(s.id);
    return { ...s, draft: draft?.content, draftUpdatedAt: draft?.updated_at ?? null, state: sectionState(s.published, draft?.content) };
  });
}

export async function getContentPages() {
  const supabase = await createClient();
  const { data: pages } = await supabase.from("pages").select("id, slug, title, is_published, is_system, updated_at").order("slug");
  const sections = await sectionsWithDrafts((pages ?? []).map((p) => p.id));
  // Home first, the shared footer last, the rest alphabetically.
  const rank = (slug: string) => (slug === "home" ? 0 : slug === "global" ? 2 : 1);
  return (pages ?? [])
    .map((p) => ({ ...p, sections: sections.filter((s) => s.page_id === p.id) }))
    .sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug));
}

export async function getContentPage(slug: string) {
  const supabase = await createClient();
  const { data: page } = await supabase.from("pages").select("*").eq("slug", slug).maybeSingle();
  if (!page) return null;
  return { ...page, sections: await sectionsWithDrafts([page.id]) };
}

export type EditorOptions = {
  universities: { value: string; label: string }[];
  hostels: { value: string; label: string }[];
  media: { id: string; url: string; alt: string; illustrative: boolean }[];
};

export async function getSectionForEdit(slug: string, key: string) {
  const page = await getContentPage(slug);
  const section = page?.sections.find((s) => s.key === key);
  if (!page || !section || !isSectionType(section.type)) return null;
  const supabase = await createClient();
  const [{ data: revisions }, { data: universities }, { data: hostels }, { data: media }] = await Promise.all([
    supabase.from("content_revisions").select("id, action, created_at, created_by").eq("section_id", section.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("universities").select("slug, name, short_name").order("sort_order"),
    supabase.from("hostels").select("slug, name, area").eq("status", "published").order("name").limit(300),
    supabase.from("media_assets").select("id, bucket, storage_path, external_url, alt_text, is_illustrative").eq("status", "active").order("created_at", { ascending: false }).limit(200),
  ]);
  const authorIds = [...new Set((revisions ?? []).map((r) => r.created_by).filter((v): v is string => Boolean(v)))];
  const { data: authors } = authorIds.length ? await supabase.from("profiles").select("id, full_name").in("id", authorIds) : { data: [] };
  const nameOf = new Map((authors ?? []).map((a) => [a.id, a.full_name || "Unnamed account"]));
  const options: EditorOptions = {
    universities: (universities ?? []).map((u) => ({ value: u.slug, label: `${u.short_name} · ${u.name}` })),
    hostels: (hostels ?? []).map((h) => ({ value: h.slug, label: `${h.name} · ${h.area}` })),
    media: (media ?? []).map((m) => ({
      id: m.id,
      url: m.external_url ?? publicStorageUrl(m.bucket, m.storage_path!),
      alt: m.alt_text,
      illustrative: m.is_illustrative,
    })),
  };
  return {
    page: { slug: page.slug, title: page.title },
    section: { ...section, type: section.type },
    revisions: (revisions ?? []).map((r) => ({
      id: r.id,
      action: r.action,
      createdAt: r.created_at,
      author: r.created_by ? (nameOf.get(r.created_by) ?? "Deleted account") : "System",
    })),
    options,
  };
}

/** A page as it will look once its saved drafts are published. */
export async function getPagePreview(slug: string) {
  const page = await getContentPage(slug);
  if (!page) return null;
  const sections: PublishedSection[] = [];
  for (const s of page.sections) {
    if (!s.is_visible || !isSectionType(s.type)) continue;
    const content = parseSection(s.type, s.draft ?? s.published);
    if (content) sections.push({ id: s.id, key: s.key, type: s.type, content } as PublishedSection);
  }
  return { slug: page.slug, title: page.title, updatedAt: page.updated_at, sections };
}

export async function getMediaLibrary() {
  const supabase = await createClient();
  const { data } = await supabase.from("media_assets").select("*").order("created_at", { ascending: false }).limit(500);
  return (data ?? []).map((m) => ({ ...m, url: m.external_url ?? publicStorageUrl(m.bucket, m.storage_path!) }));
}

export type MediaItem = Awaited<ReturnType<typeof getMediaLibrary>>[number];

export async function getSiteAdmin() {
  const supabase = await createClient();
  const [{ data: settings }, { data: nav }, { data: banners }, { data: media }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("navigation_items").select("*").order("sort_order").order("label"),
    supabase.from("promo_banners").select("*").order("sort_order").order("updated_at", { ascending: false }),
    supabase.from("media_assets").select("id, alt_text").eq("status", "active").order("created_at", { ascending: false }).limit(200),
  ]);
  return {
    settings,
    header: (nav ?? []).filter((n) => n.location === "header"),
    footer: (nav ?? []).filter((n) => n.location === "footer"),
    banners: banners ?? [],
    media: (media ?? []).map((m) => ({ id: m.id, alt: m.alt_text })),
  };
}

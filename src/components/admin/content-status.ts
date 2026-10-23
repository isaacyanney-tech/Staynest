import type { SectionState } from "@/lib/cms/fields";

export const SECTION_STATE: Record<SectionState, { label: string; tone: "success" | "warning" | "info" | "neutral" }> = {
  live: { label: "Live", tone: "success" },
  changed: { label: "Unpublished changes", tone: "warning" },
  draft: { label: "Not published yet", tone: "info" },
  empty: { label: "Empty", tone: "neutral" },
};

/** Public address of a CMS page; the shared "global" page has none. */
export function publicPath(slug: string): string | null {
  if (slug === "global") return null;
  return slug === "home" ? "/" : `/${slug}`;
}

export const PAGE_NAME: Record<string, string> = { home: "Homepage", global: "Every page (footer)" };

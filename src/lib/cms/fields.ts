import type { Json } from "@/lib/supabase/database.types";
import type { SectionType } from "./schemas";

// Describes the form for each CMS section type. The editor renders these
// fields; the section schemas in ./schemas.ts remain the source of truth for
// what may be saved, so a field missing here cannot bypass validation.

export type FieldSpec =
  | { kind: "text"; name: string; label: string; max: number; required?: boolean; hint?: string }
  | { kind: "textarea"; name: string; label: string; max: number; required?: boolean; hint?: string; rows?: number; markdown?: boolean }
  | { kind: "link"; name: string; label: string; optional?: boolean; hint?: string }
  | { kind: "media"; name: string; label: string; hint?: string }
  | { kind: "count"; name: string; label: string; min: number; max: number; hint?: string }
  | { kind: "choices"; name: string; label: string; source: "universities" | "hostels"; max: number; hint?: string }
  | { kind: "list"; name: string; label: string; itemLabel: string; min: number; max: number; fields: FieldSpec[]; hint?: string };

const MARKDOWN_HINT = "Use a blank line between paragraphs, ## for a heading, - for a list and **bold**.";

const heading = (max = 100): FieldSpec => ({ kind: "text", name: "heading", label: "Heading", max, required: true });
const card = (body = 300): FieldSpec[] => [
  { kind: "text", name: "title", label: "Title", max: 80, required: true },
  { kind: "textarea", name: "body", label: "Text", max: body, rows: 2 },
];

export const SECTION_FIELDS: Record<SectionType, FieldSpec[]> = {
  hero: [
    { kind: "text", name: "eyebrow", label: "Small line above the heading", max: 60 },
    heading(120),
    { kind: "textarea", name: "subheading", label: "Introduction", max: 280, rows: 3 },
    { kind: "text", name: "searchPlaceholder", label: "Search box placeholder", max: 80 },
    { kind: "link", name: "primaryCta", label: "Main button" },
    { kind: "link", name: "secondaryCta", label: "Second button", optional: true },
    { kind: "media", name: "mediaId", label: "Image", hint: "Shown beside the heading on wide screens. Choose from the media library." },
    {
      kind: "list",
      name: "stats",
      label: "Figures",
      itemLabel: "Figure",
      min: 0,
      max: 4,
      hint: "Only use figures you can back up.",
      fields: [
        { kind: "text", name: "value", label: "Figure", max: 20 },
        { kind: "text", name: "label", label: "What it counts", max: 60 },
      ],
    },
  ],
  popular_universities: [
    heading(),
    { kind: "textarea", name: "subheading", label: "Introduction", max: 240, rows: 2 },
    { kind: "choices", name: "universitySlugs", label: "Universities to show", source: "universities", max: 12, hint: "Leave all unticked to show the ones marked popular." },
  ],
  featured_hostels: [
    heading(),
    { kind: "textarea", name: "subheading", label: "Introduction", max: 240, rows: 2 },
    { kind: "choices", name: "hostelSlugs", label: "Hostels to show first", source: "hostels", max: 12, hint: "Paid placements and new listings fill the remaining spaces." },
    { kind: "count", name: "limit", label: "How many to show", min: 1, max: 12 },
  ],
  ratings: [
    heading(),
    { kind: "textarea", name: "subheading", label: "Introduction", max: 240, rows: 2 },
    { kind: "count", name: "limit", label: "How many ratings to show", min: 1, max: 12, hint: "The newest ratings are shown. The section stays hidden until there is at least one." },
  ],
  how_it_works: [heading(), { kind: "list", name: "steps", label: "Steps", itemLabel: "Step", min: 1, max: 6, fields: card() }],
  trust: [
    heading(),
    { kind: "textarea", name: "body", label: "Introduction", max: 400, rows: 3 },
    { kind: "list", name: "points", label: "Points", itemLabel: "Point", min: 0, max: 6, fields: card() },
    { kind: "link", name: "link", label: "Link", optional: true },
  ],
  cta: [heading(), { kind: "textarea", name: "body", label: "Text", max: 300, rows: 3 }, { kind: "link", name: "cta", label: "Button" }],
  faq: [
    heading(),
    {
      kind: "list",
      name: "items",
      label: "Questions",
      itemLabel: "Question",
      min: 0,
      max: 40,
      fields: [
        { kind: "text", name: "q", label: "Question", max: 200, required: true },
        { kind: "textarea", name: "a", label: "Answer", max: 1200, required: true, rows: 4, markdown: true, hint: MARKDOWN_HINT },
      ],
    },
  ],
  rich_text: [heading(120), { kind: "textarea", name: "body", label: "Text", max: 20000, rows: 18, markdown: true, hint: MARKDOWN_HINT }],
  about: [heading(120), { kind: "textarea", name: "body", label: "Text", max: 20000, rows: 18, markdown: true, hint: MARKDOWN_HINT }],
  contact: [heading(), { kind: "textarea", name: "body", label: "Introduction", max: 600, rows: 4, hint: "Email, phone and address come from site settings." }],
  footer: [
    { kind: "textarea", name: "blurb", label: "Short description", max: 300, rows: 3 },
    { kind: "textarea", name: "legal", label: "Small print", max: 300, rows: 2 },
  ],
};

/** An empty value for a field, used for new list items and missing content. */
export function emptyValue(field: FieldSpec): unknown {
  switch (field.kind) {
    case "link":
      return field.optional ? null : { label: "", href: "" };
    case "media":
      return null;
    case "count":
      return field.min;
    case "choices":
      return [];
    case "list":
      return Array.from({ length: field.min }, () => emptyItem(field.fields));
    default:
      return "";
  }
}

export function emptyItem(fields: FieldSpec[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((f) => [f.name, emptyValue(f)]));
}

/** Fills in any field the stored content lacks, so the editor always has a value to show. */
export function withDefaults(fields: FieldSpec[], content: unknown): Record<string, unknown> {
  const source = content && typeof content === "object" && !Array.isArray(content) ? (content as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...source };
  for (const f of fields) {
    const v = source[f.name];
    if (v === undefined) out[f.name] = emptyValue(f);
    else if (f.kind === "list" && Array.isArray(v)) out[f.name] = v.map((item) => withDefaults(f.fields, item));
  }
  return out;
}

/** Key-order-independent comparison of two JSON values, for "unpublished changes". */
export function sameContent(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

export type SectionState = "live" | "changed" | "draft" | "empty";

/** Where a section stands: live as saved, live with unpublished edits, never published, or empty. */
export function sectionState(published: Json | null, draft: Json | undefined): SectionState {
  if (published === null) return draft === undefined ? "empty" : "draft";
  return draft === undefined || sameContent(draft, published) ? "live" : "changed";
}

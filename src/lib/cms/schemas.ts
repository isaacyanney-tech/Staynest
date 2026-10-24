import { z } from "zod";

// Content shapes for each CMS section type. The admin editor validates drafts
// with these schemas before saving, and public pages parse published content
// with them, so a malformed row renders nothing rather than breaking a page.

const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => z.string().trim().min(1, "Fill this in.").max(max);

export const safeHref = z
  .string()
  .trim()
  .max(300)
  .refine((v) => /^\/(?!\/)[A-Za-z0-9/_?=&#.%-]*$/.test(v) || /^https:\/\/[^\s<>"]+$/.test(v), {
    message: "Use a path starting with / or a full https:// link",
  });

export const linkSchema = z.object({ label: required(40), href: safeHref });

export const heroSchema = z.object({
  eyebrow: text(60),
  heading: required(120),
  subheading: text(280),
  searchPlaceholder: text(80),
  primaryCta: linkSchema,
  secondaryCta: linkSchema.nullable().optional(),
  mediaId: z.uuid().nullable().optional(),
  stats: z.array(z.object({ value: text(20), label: text(60) })).max(4).default([]),
});

export const popularUniversitiesSchema = z.object({
  heading: required(100),
  subheading: text(240),
  universitySlugs: z.array(z.string().max(80)).max(12).default([]),
});

export const featuredHostelsSchema = z.object({
  heading: required(100),
  subheading: text(240),
  hostelSlugs: z.array(z.string().max(80)).max(12).default([]),
  limit: z.number().int().min(1).max(12).default(6),
});

export const ratingsSchema = z.object({
  heading: required(100),
  subheading: text(240),
  limit: z.number().int().min(1).max(12).default(6),
});

export const howItWorksSchema = z.object({
  heading: required(100),
  steps: z.array(z.object({ title: required(80), body: text(300) })).min(1).max(6),
});

export const trustSchema = z.object({
  heading: required(100),
  body: text(400),
  points: z.array(z.object({ title: required(80), body: text(300) })).max(6),
  link: linkSchema.nullable().optional(),
});

export const ctaSchema = z.object({
  heading: required(100),
  body: text(300),
  cta: linkSchema,
});

export const faqSchema = z.object({
  heading: required(100),
  items: z.array(z.object({ q: required(200), a: required(1200) })).max(40),
});

export const richTextSchema = z.object({
  heading: required(120),
  body: text(20000),
});

export const contactSchema = z.object({
  heading: required(100),
  body: text(600),
});

export const footerSchema = z.object({
  blurb: text(300),
  legal: text(300),
});

export const SECTION_SCHEMAS = {
  hero: heroSchema,
  popular_universities: popularUniversitiesSchema,
  featured_hostels: featuredHostelsSchema,
  how_it_works: howItWorksSchema,
  ratings: ratingsSchema,
  trust: trustSchema,
  cta: ctaSchema,
  faq: faqSchema,
  rich_text: richTextSchema,
  about: richTextSchema,
  contact: contactSchema,
  footer: footerSchema,
} as const;

export type SectionType = keyof typeof SECTION_SCHEMAS;
export type SectionContent<T extends SectionType> = z.infer<(typeof SECTION_SCHEMAS)[T]>;

export function isSectionType(value: string): value is SectionType {
  return value in SECTION_SCHEMAS;
}

export function parseSection<T extends SectionType>(type: T, content: unknown): SectionContent<T> | null {
  const result = SECTION_SCHEMAS[type].safeParse(content);
  return result.success ? (result.data as SectionContent<T>) : null;
}

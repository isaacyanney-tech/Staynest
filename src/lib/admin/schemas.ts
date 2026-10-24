import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
import { PRIMARY_OPTIONS, SECONDARY_OPTIONS, type PrimaryColor, type SecondaryColor } from "@/lib/theme";

const note = z.string().trim().max(1000, "Keep the note under 1,000 characters.");

export const moderationSchema = z
  .object({
    hostelId: z.uuid(),
    decision: z.enum(["publish", "reject", "suspend"], "Choose what to do with this listing."),
    note,
  })
  .refine((v) => v.decision === "publish" || v.note.length >= 10, {
    path: ["note"],
    message: "Tell the owner what to change, in a sentence or two.",
  });

export const verificationDecisionSchema = z
  .object({
    applicationId: z.uuid(),
    decision: z.enum(["approved", "needs_info", "rejected"], "Choose a decision."),
    note,
  })
  .refine((v) => v.decision === "approved" || v.note.length >= 10, {
    path: ["note"],
    message: "Tell the owner what you need or why, in a sentence or two.",
  });

export const userAccessSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["student", "owner", "admin"], "Choose a role."),
  suspended: z.boolean(),
});

const wholeNumber = (min: number, max: number) => z.coerce.number().int("Use a whole number.").min(min).max(max);

export const planSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2, "Enter a plan name.").max(60),
  description: z.string().trim().max(300),
  price_amount: z.coerce.number().min(0, "The price cannot be negative.").max(1_000_000),
  billing_interval: z.enum(["month", "year"]),
  // Blank means no limit.
  listing_limit: z.union([z.literal(""), wholeNumber(0, 10_000)]).transform((v) => (v === "" ? null : v)),
  photo_limit: wholeNumber(1, 60),
  featured_slots: wholeNumber(0, 100),
  features: z
    .string()
    .transform((v) => v.split("\n").map((l) => l.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(80, "Keep each feature under 80 characters.")).max(12, "List at most 12 features.")),
  is_active: z.boolean(),
  makeDefault: z.boolean(),
});

export function planFromForm(formData: FormData) {
  return planSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    price_amount: formData.get("price_amount"),
    billing_interval: formData.get("billing_interval"),
    listing_limit: formData.get("listing_limit") ?? "",
    photo_limit: formData.get("photo_limit"),
    featured_slots: formData.get("featured_slots"),
    features: formData.get("features") ?? "",
    is_active: formData.get("is_active") === "on",
    makeDefault: formData.get("makeDefault") === "on",
  });
}

/**
 * Parses a business setting from the form, keeping the stored value's type so
 * code that reads it (counts, prices, switches) never receives the wrong kind.
 */
export function businessValue(key: string, current: Json, raw: FormDataEntryValue | null): { ok: true; value: Json } | { ok: false; message: string } {
  if (typeof current === "boolean") return { ok: true, value: raw === "on" || raw === "true" };
  const text = typeof raw === "string" ? raw.trim() : "";
  if (typeof current === "number") {
    if (text === "" || !/^-?\d+(\.\d+)?$/.test(text)) return { ok: false, message: "Enter a number." };
    const n = Number(text);
    if (n < 0) return { ok: false, message: "Enter zero or more." };
    // Counts stay whole numbers; prices and fees may have pesewas.
    const money = /price|fee|amount/.test(key);
    if (!money && !Number.isInteger(n)) return { ok: false, message: "Use a whole number." };
    if (money && !/^\d+(\.\d{1,2})?$/.test(text)) return { ok: false, message: "Use at most two decimal places." };
    return { ok: true, value: n };
  }
  if (typeof current === "string") {
    if (text.length > 500) return { ok: false, message: "Keep it under 500 characters." };
    return { ok: true, value: text };
  }
  return { ok: false, message: "This setting can only be changed in the database." };
}

export const mediaDetailsSchema = z.object({
  alt: z.string().trim().min(3, "Describe the image in a few words.").max(200),
  caption: z.string().trim().max(200).transform((v) => v || null),
  credit: z.string().trim().max(200).transform((v) => v || null),
  illustrative: z.boolean(),
});

export function mediaDetailsFromForm(formData: FormData) {
  return mediaDetailsSchema.safeParse({
    alt: formData.get("alt") ?? "",
    caption: formData.get("caption") ?? "",
    credit: formData.get("credit") ?? "",
    illustrative: formData.get("illustrative") === "on",
  });
}

// ------------------------------------------------------------------ site settings

const optionalHttps = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\/[^\s<>"]+$/.test(v), "Use a full link starting with https://");

export const SITE_GROUPS = {
  identity: z.object({
    site_name: z.string().trim().min(2, "Enter the site name.").max(60),
    tagline: z.string().trim().max(160),
    logo_media_id: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
    favicon_media_id: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
  }),
  theme: z.object({
    primary: z.enum(Object.keys(PRIMARY_OPTIONS) as [PrimaryColor, ...PrimaryColor[]], "Choose a main colour."),
    secondary: z.enum(Object.keys(SECONDARY_OPTIONS) as [SecondaryColor, ...SecondaryColor[]], "Choose an accent colour."),
  }),
  contact: z.object({
    email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
    phone: z.string().trim().max(40).regex(/^[+\d\s()-]*$/, "Use digits, spaces and + only."),
    address: z.string().trim().max(200),
    hours: z.string().trim().max(100),
  }),
  social: z.object({ facebook: optionalHttps, instagram: optionalHttps, x: optionalHttps, tiktok: optionalHttps }),
  seo: z.object({
    title: z.string().trim().max(70, "Search engines cut titles after about 70 characters."),
    description: z.string().trim().max(170, "Search engines cut descriptions after about 170 characters."),
  }),
} as const;

export type SiteGroup = keyof typeof SITE_GROUPS;

export function isSiteGroup(v: unknown): v is SiteGroup {
  return typeof v === "string" && v in SITE_GROUPS;
}

/** Validates one group of the site settings form, reading only that group's fields. */
export function siteGroupFromForm<G extends SiteGroup>(group: G, formData: FormData): z.ZodSafeParseResult<z.output<(typeof SITE_GROUPS)[G]>> {
  const schema = SITE_GROUPS[group];
  const raw = Object.fromEntries(Object.keys(schema.shape).map((k) => [k, String(formData.get(k) ?? "")]));
  return schema.safeParse(raw) as z.ZodSafeParseResult<z.output<(typeof SITE_GROUPS)[G]>>;
}

// Same rule as the database check: site paths or https links, nothing else.
const href = z
  .string()
  .trim()
  .max(300)
  .refine((v) => /^\/(?!\/)[A-Za-z0-9/_?=&#.-]*$/.test(v) || /^https:\/\/[^\s<>"]+$/.test(v), "Use a path starting with / or a full https:// link.");

export const navItemSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  location: z.enum(["header", "footer"]),
  group_label: z.string().trim().max(40).transform((v) => v || null),
  label: z.string().trim().min(1, "Enter the link text.").max(40),
  href,
  is_visible: z.boolean(),
});

export function navItemFromForm(formData: FormData) {
  return navItemSchema.safeParse({
    id: formData.get("id") ?? "",
    location: formData.get("location"),
    group_label: formData.get("group_label") ?? "",
    label: formData.get("label") ?? "",
    href: formData.get("href") ?? "",
    is_visible: formData.get("is_visible") === "on",
  });
}

const when = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Enter a valid date and time.")
  .transform((v) => (v ? new Date(v).toISOString() : null));

export const bannerSchema = z
  .object({
    id: z.union([z.literal(""), z.uuid()]),
    message: z.string().trim().min(3, "Write the message.").max(160),
    link_label: z.string().trim().max(40).transform((v) => v || null),
    link_href: z.union([z.literal(""), href]).transform((v) => v || null),
    tone: z.enum(["info", "promo", "notice"]),
    starts_at: when,
    ends_at: when,
    is_active: z.boolean(),
  })
  .refine((b) => Boolean(b.link_label) === Boolean(b.link_href), { path: ["link_href"], message: "Give the link both text and an address, or neither." })
  .refine((b) => !b.starts_at || !b.ends_at || b.ends_at > b.starts_at, { path: ["ends_at"], message: "The end must be after the start." });

export function bannerFromForm(formData: FormData) {
  return bannerSchema.safeParse({
    id: formData.get("id") ?? "",
    message: formData.get("message") ?? "",
    link_label: formData.get("link_label") ?? "",
    link_href: formData.get("link_href") ?? "",
    tone: formData.get("tone"),
    starts_at: formData.get("starts_at") ?? "",
    ends_at: formData.get("ends_at") ?? "",
    is_active: formData.get("is_active") === "on",
  });
}

export const ratingModerationSchema = z
  .object({
    ratingId: z.uuid(),
    hide: z.enum(["true", "false"]).transform((v) => v === "true"),
    reason: z.string().trim().max(300, "Keep the reason under 300 characters.").default(""),
  })
  .refine((v) => !v.hide || v.reason.length > 0, { path: ["reason"], message: "Say why the rating is hidden. The student sees that it was hidden." });

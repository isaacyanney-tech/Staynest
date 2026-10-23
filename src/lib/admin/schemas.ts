import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";

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

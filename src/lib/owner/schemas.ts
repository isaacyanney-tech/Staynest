import { z } from "zod";
import { AMENITIES } from "@/lib/format";

const optionalText = (max: number, message?: string) => z.string().trim().max(max, message);

export const hostelSchema = z.object({
  name: z.string().trim().min(3, "Enter the hostel's name.").max(120, "Keep the name under 120 characters."),
  summary: optionalText(240, "Keep the summary under 240 characters."),
  description: optionalText(6000, "Keep the description under 6,000 characters."),
  universityId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  address: optionalText(200),
  area: z.string().trim().min(2, "Enter the area or neighbourhood.").max(80),
  city: z.string().trim().min(2, "Enter the town or city.").max(80),
  distanceKm: z
    .union([z.literal(""), z.coerce.number().min(0, "Distance cannot be negative.").max(200, "Enter a distance under 200 km.")])
    .transform((v) => (v === "" ? null : Math.round(v * 100) / 100)),
  gender: z.enum(["mixed", "male", "female"], "Choose who can stay."),
  amenities: z.array(z.string()).transform((a) => [...new Set(a.filter((k) => k in AMENITIES))]),
  houseRules: optionalText(3000, "Keep the house rules under 3,000 characters."),
  contactPhone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[0-9+() -]{7,20}$/.test(v), "Enter a phone number like +233 20 123 4567.")
    .transform((v) => v || null),
});

export type HostelInput = z.infer<typeof hostelSchema>;

export function hostelFromForm(formData: FormData) {
  return hostelSchema.safeParse({
    name: formData.get("name") ?? "",
    summary: formData.get("summary") ?? "",
    description: formData.get("description") ?? "",
    universityId: formData.get("universityId") ?? "",
    address: formData.get("address") ?? "",
    area: formData.get("area") ?? "",
    city: formData.get("city") ?? "",
    distanceKm: formData.get("distanceKm") ?? "",
    gender: formData.get("gender"),
    amenities: formData.getAll("amenities").map(String),
    houseRules: formData.get("houseRules") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
  });
}

export const roomSchema = z
  .object({
    name: z.string().trim().min(2, "Name the room type, for example “Two in a room”.").max(80),
    occupancy: z.coerce.number().int("Use a whole number.").min(1, "At least 1 person.").max(12, "At most 12 people."),
    price: z.coerce.number().gt(0, "Enter a price above zero.").lt(1_000_000, "Enter a price under GHS 1,000,000."),
    period: z.enum(["academic_year", "semester", "month"], "Choose a billing period."),
    total: z.coerce.number().int("Use a whole number.").min(0).max(10_000),
    available: z.coerce.number().int("Use a whole number.").min(0).max(10_000),
    description: optionalText(1000),
  })
  .refine((r) => r.available <= r.total, { path: ["available"], message: "Available rooms cannot exceed the total." });

export function roomFromForm(formData: FormData) {
  return roomSchema.safeParse({
    name: formData.get("name") ?? "",
    occupancy: formData.get("occupancy"),
    price: formData.get("price"),
    period: formData.get("period"),
    total: formData.get("total"),
    available: formData.get("available"),
    description: formData.get("description") ?? "",
  });
}

export const altSchema = z.string().trim().min(3, "Describe the photo in a few words, for example “Two-bed room with a desk”.").max(200);
export const captionSchema = z.string().trim().max(200).transform((v) => v || null);

export const inspectionResponseSchema = z
  .object({
    id: z.uuid(),
    decision: z.enum(["accepted", "declined", "rescheduled", "completed"]),
    reply: z.string().trim().max(1000, "Keep your reply under 1,000 characters."),
    proposedDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).transform((v) => v || null),
  })
  .refine((v) => v.decision !== "rescheduled" || v.proposedDate, { path: ["proposedDate"], message: "Choose the date you can offer." })
  .refine((v) => v.decision !== "declined" || v.reply.length > 0, { path: ["reply"], message: "Tell the student why, so they can look elsewhere." });

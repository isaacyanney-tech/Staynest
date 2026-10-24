import { z } from "zod";

export const newPassword = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Use 72 characters or fewer.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Include at least one letter and one number.");

export const passwordChangeSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords do not match." });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120, "Use 120 characters or fewer."),
  // Same rule as the database check on profiles.phone. Empty clears it.
  phone: z
    .string()
    .trim()
    .max(20, "Use 20 characters or fewer.")
    .refine((v) => v === "" || /^[0-9+() -]{7,20}$/.test(v), "Use digits, spaces, + and brackets only, like +233 24 123 4567.")
    .transform((v) => (v === "" ? null : v)),
});

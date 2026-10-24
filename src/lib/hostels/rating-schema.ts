import { z } from "zod";

export const RATING_LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"] as const;

export const ratingSchema = z.object({
  hostelId: z.uuid(),
  stars: z.coerce.number("Choose a star rating.").int().min(1, "Choose a star rating.").max(5, "Choose a star rating."),
  comment: z.string().trim().max(600, "Keep your comment under 600 characters.").default(""),
});

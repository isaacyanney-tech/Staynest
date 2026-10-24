import { describe, expect, it } from "vitest";
import { ratingSchema } from "./rating-schema";

const hostelId = "6f1c2c4e-8a6b-4c1e-9f3a-2b7d5e8c9a10";

describe("ratingSchema", () => {
  it("accepts one to five stars and trims the comment", () => {
    const r = ratingSchema.parse({ hostelId, stars: "4", comment: "  Quiet at night.  " });
    expect(r).toEqual({ hostelId, stars: 4, comment: "Quiet at night." });
  });

  it("rejects missing, zero, fractional and out-of-range stars", () => {
    for (const stars of [null, "", "0", "2.5", "6", "five"]) {
      const r = ratingSchema.safeParse({ hostelId, stars, comment: "" });
      expect(r.success, String(stars)).toBe(false);
    }
  });

  it("limits comments to 600 characters", () => {
    expect(ratingSchema.safeParse({ hostelId, stars: 5, comment: "a".repeat(601) }).success).toBe(false);
    expect(ratingSchema.safeParse({ hostelId, stars: 5, comment: "a".repeat(600) }).success).toBe(true);
  });

  it("needs a real hostel id", () => {
    expect(ratingSchema.safeParse({ hostelId: "x", stars: 5 }).success).toBe(false);
  });
});

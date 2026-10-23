import { describe, expect, it } from "vitest";
import { featuredCheckoutSchema, paymentReferenceSchema, planCheckoutSchema } from "./schemas";

describe("billing schemas", () => {
  it("accepts 1 to 12 whole weeks", () => {
    const hostelId = "e2e10000-0000-4000-8000-000000000004";
    expect(featuredCheckoutSchema.safeParse({ hostelId, weeks: "3" }).data).toEqual({ hostelId, weeks: 3 });
    for (const weeks of ["0", "13", "1.5", "", "two"]) expect(featuredCheckoutSchema.safeParse({ hostelId, weeks }).success).toBe(false);
    expect(featuredCheckoutSchema.safeParse({ hostelId: "not-a-uuid", weeks: "1" }).success).toBe(false);
  });

  it("only takes plan codes, never prices", () => {
    expect(planCheckoutSchema.parse({ plan: "standard", price: 1 })).toEqual({ plan: "standard" });
    expect(planCheckoutSchema.safeParse({ plan: "standard'; drop" }).success).toBe(false);
  });

  it("checks payment references before they reach Paystack's URL", () => {
    expect(paymentReferenceSchema.safeParse("sn_0123456789abcdef").success).toBe(true);
    expect(paymentReferenceSchema.safeParse("../transfer").success).toBe(false);
    expect(paymentReferenceSchema.safeParse("abc").success).toBe(false);
  });
});

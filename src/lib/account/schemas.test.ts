import { describe, expect, it } from "vitest";
import { passwordChangeSchema, profileSchema } from "./schemas";

describe("profileSchema", () => {
  it("trims the name and turns an empty phone into null", () => {
    expect(profileSchema.parse({ fullName: "  Ama Mensah ", phone: "" })).toEqual({ fullName: "Ama Mensah", phone: null });
    expect(profileSchema.parse({ fullName: "Ama", phone: " +233 (24) 111-2222 " }).phone).toBe("+233 (24) 111-2222");
  });

  it("matches the database rule for phone numbers", () => {
    for (const phone of ["call me", "123", "+233 24 111 2222 33 44 55"]) expect(profileSchema.safeParse({ fullName: "Ama", phone }).success).toBe(false);
  });
});

describe("passwordChangeSchema", () => {
  it("needs a strong password typed twice", () => {
    expect(passwordChangeSchema.safeParse({ password: "NewPassword123", confirm: "NewPassword123" }).success).toBe(true);
    expect(passwordChangeSchema.safeParse({ password: "NewPassword123", confirm: "NewPassword124" }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ password: "short1", confirm: "short1" }).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { changedFields, describeAudit } from "./audit";

describe("describeAudit", () => {
  it("describes moderation and verification", () => {
    expect(describeAudit({ action: "hostel.status_changed", entity: "hostels", details: { from: "pending_review", to: "published" } })).toBe(
      "Moved a listing to published",
    );
    expect(describeAudit({ action: "verification.decided", entity: "verification_applications", details: { status: "needs_info" } })).toBe(
      "Marked a verification request as needs more information",
    );
    expect(describeAudit({ action: "hostel.verification_changed", entity: "hostels", details: { verified: true } })).toBe("Marked a listing as verified");
  });

  it("describes role and suspension changes", () => {
    expect(
      describeAudit({ action: "profile.access_changed", entity: "profiles", details: { from_role: "student", to_role: "admin", from_suspended: false, to_suspended: false } }),
    ).toBe("Made an account an admin");
    expect(
      describeAudit({ action: "profile.access_changed", entity: "profiles", details: { from_role: "owner", to_role: "owner", from_suspended: false, to_suspended: true } }),
    ).toBe("Suspended an account");
  });

  it("names the changed row for table changes and survives odd details", () => {
    expect(describeAudit({ action: "plans.update", entity: "plans", details: { before: { name: "Standard" }, after: { name: "Standard" } } })).toBe(
      "Updated the plan “Standard”",
    );
    expect(describeAudit({ action: "business_settings.update", entity: "business_settings", details: { after: { label: "Fee" } } })).toBe(
      "Updated the business setting “Fee”",
    );
    expect(describeAudit({ action: "something_new.insert", entity: "x", details: null })).toBe("Added a something new");
  });
});

describe("changedFields", () => {
  it("lists only fields that changed, ignoring timestamps", () => {
    const rows = changedFields({
      before: { name: "Standard", price_amount: 150, updated_at: "a", features: ["a"] },
      after: { name: "Standard", price_amount: 175, updated_at: "b", features: ["a", "b"] },
    });
    expect(rows).toEqual([
      { field: "price_amount", before: "150", after: "175" },
      { field: "features", before: '["a"]', after: '["a","b"]' },
    ]);
  });
  it("returns nothing for entries without before and after", () => {
    expect(changedFields({ to: "published" })).toEqual([]);
    expect(changedFields("nonsense")).toEqual([]);
  });
});

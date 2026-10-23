import { describe, expect, it } from "vitest";
import { businessValue, moderationSchema, planFromForm, verificationDecisionSchema } from "./schemas";

const id = "6f1c1f9e-8a51-4d5c-9b6e-0d6f3b9b1a11";

describe("moderation and verification decisions", () => {
  it("publishing needs no note, sending back or suspending does", () => {
    expect(moderationSchema.safeParse({ hostelId: id, decision: "publish", note: "" }).success).toBe(true);
    expect(moderationSchema.safeParse({ hostelId: id, decision: "reject", note: "Fix it" }).success).toBe(false);
    expect(moderationSchema.safeParse({ hostelId: id, decision: "suspend", note: "Reported as a scam by two students." }).success).toBe(true);
    expect(moderationSchema.safeParse({ hostelId: id, decision: "delete", note: "" }).success).toBe(false);
  });
  it("asking for more information needs a question", () => {
    expect(verificationDecisionSchema.safeParse({ applicationId: id, decision: "approved", note: "" }).success).toBe(true);
    expect(verificationDecisionSchema.safeParse({ applicationId: id, decision: "needs_info", note: "" }).success).toBe(false);
    expect(verificationDecisionSchema.safeParse({ applicationId: id, decision: "needs_info", note: "Please send the full lease." }).success).toBe(true);
  });
});

describe("planFromForm", () => {
  const form = (o: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(o)) fd.append(k, v);
    return fd;
  };
  const base = { id, name: "Standard", description: "", price_amount: "150", billing_interval: "month", photo_limit: "20", featured_slots: "1" };

  it("treats a blank listing limit as unlimited and splits features by line", () => {
    const r = planFromForm(form({ ...base, listing_limit: "", features: "Up to 5 listings\n\n  Priority support  \n", is_active: "on" }));
    expect(r.data).toMatchObject({ listing_limit: null, features: ["Up to 5 listings", "Priority support"], is_active: true, makeDefault: false });
  });
  it("rejects negative prices and out-of-range limits", () => {
    const r = planFromForm(form({ ...base, price_amount: "-1", photo_limit: "100", listing_limit: "2.5" }));
    expect(r.error!.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(["price_amount", "photo_limit", "listing_limit"]));
  });
});

describe("businessValue", () => {
  it("keeps the stored type", () => {
    expect(businessValue("featured.homepage_slots", 6, "8")).toEqual({ ok: true, value: 8 });
    expect(businessValue("featured.homepage_slots", 6, "8.5")).toEqual({ ok: false, message: "Use a whole number." });
    expect(businessValue("featured.price_per_week", 50, "55.25")).toEqual({ ok: true, value: 55.25 });
    expect(businessValue("featured.price_per_week", 50, "55.255")).toMatchObject({ ok: false });
    expect(businessValue("featured.price_per_week", 50, "0.29")).toEqual({ ok: true, value: 0.29 });
    expect(businessValue("x.count", 6, "six")).toMatchObject({ ok: false });
    expect(businessValue("x.count", 6, "-1")).toMatchObject({ ok: false });
    expect(businessValue("x.enabled", true, null)).toEqual({ ok: true, value: false });
    expect(businessValue("x.enabled", false, "on")).toEqual({ ok: true, value: true });
    expect(businessValue("x.text", "hello", "  hi ")).toEqual({ ok: true, value: "hi" });
    expect(businessValue("x.obj", { a: 1 }, "x")).toMatchObject({ ok: false });
  });
});

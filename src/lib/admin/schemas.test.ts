import { describe, expect, it } from "vitest";
import { bannerFromForm, businessValue, moderationSchema, navItemFromForm, planFromForm, siteGroupFromForm, verificationDecisionSchema } from "./schemas";

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

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

describe("site settings", () => {
  it("only offers approved colours", () => {
    expect(siteGroupFromForm("theme", form({ primary: "#173B57", secondary: "#18A999" })).success).toBe(true);
    expect(siteGroupFromForm("theme", form({ primary: "#FF00FF", secondary: "#18A999" })).success).toBe(false);
  });
  it("social links must be https or blank", () => {
    expect(siteGroupFromForm("social", form({ facebook: "https://facebook.com/staynest", instagram: "", x: "", tiktok: "" })).success).toBe(true);
    expect(siteGroupFromForm("social", form({ facebook: "javascript:alert(1)", instagram: "", x: "", tiktok: "" })).success).toBe(false);
    expect(siteGroupFromForm("social", form({ facebook: "http://facebook.com", instagram: "", x: "", tiktok: "" })).success).toBe(false);
  });
  it("blank logo means the built-in one", () => {
    const r = siteGroupFromForm("identity", form({ site_name: "StayNest", tagline: "", logo_media_id: "", favicon_media_id: "" }));
    expect(r.success && r.data.logo_media_id).toBe(null);
  });
  it("ignores fields from other groups", () => {
    const r = siteGroupFromForm("contact", form({ email: "", phone: "+233 20 000 0000", address: "", hours: "", site_name: "x" }));
    expect(r.success && Object.keys(r.data).sort()).toEqual(["address", "email", "hours", "phone"]);
  });
});

describe("navigation and banners", () => {
  const nav = { id: "", location: "footer", group_label: "", label: "About", href: "/about", is_visible: "on" };
  it("links are site paths or https", () => {
    expect(navItemFromForm(form(nav)).success).toBe(true);
    expect(navItemFromForm(form({ ...nav, href: "//evil.example" })).success).toBe(false);
    expect(navItemFromForm(form({ ...nav, href: "javascript:alert(1)" })).success).toBe(false);
    expect(navItemFromForm(form({ ...nav, href: "https://wa.me/233200000000" })).success).toBe(true);
  });
  const banner = { id: "", message: "Applications open", link_label: "", link_href: "", tone: "info", starts_at: "", ends_at: "" };
  it("a banner link needs both text and address", () => {
    expect(bannerFromForm(form(banner)).success).toBe(true);
    expect(bannerFromForm(form({ ...banner, link_label: "Read more" })).success).toBe(false);
    expect(bannerFromForm(form({ ...banner, link_label: "Read more", link_href: "/faq" })).success).toBe(true);
  });
  it("a banner must end after it starts", () => {
    expect(bannerFromForm(form({ ...banner, starts_at: "2026-11-02T09:00", ends_at: "2026-11-01T09:00" })).success).toBe(false);
    const ok = bannerFromForm(form({ ...banner, starts_at: "2026-11-01T09:00", ends_at: "2026-11-02T09:00" }));
    expect(ok.success && ok.data.is_active).toBe(false);
  });
});

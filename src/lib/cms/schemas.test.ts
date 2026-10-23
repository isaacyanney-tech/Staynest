import { describe, expect, it } from "vitest";
import { parseSection, safeHref } from "./schemas";

describe("safeHref", () => {
  it.each(["/hostels", "/sign-up?role=owner", "/#how-it-works", "https://example.com/a"])("accepts %s", (v) => {
    expect(safeHref.safeParse(v).success).toBe(true);
  });
  it.each(["javascript:alert(1)", "//evil.example", "http://insecure.example", "/a b", "data:text/html,x"])("rejects %s", (v) => {
    expect(safeHref.safeParse(v).success).toBe(false);
  });
});

describe("parseSection", () => {
  it("parses valid content and applies defaults", () => {
    const faq = parseSection("faq", { heading: "Questions", items: [{ q: "Is it free?", a: "Yes." }] });
    expect(faq?.items).toHaveLength(1);
  });

  it("returns null for malformed content instead of throwing", () => {
    expect(parseSection("faq", { heading: "", items: "nope" })).toBeNull();
    expect(parseSection("cta", { heading: "Go", cta: { label: "x", href: "javascript:alert(1)" } })).toBeNull();
  });
});

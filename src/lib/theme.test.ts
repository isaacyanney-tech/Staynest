import { describe, expect, it } from "vitest";
import { contrastRatio, PRIMARY_OPTIONS, SECONDARY_OPTIONS, themeToCssVars } from "./theme";

const WHITE = "#FFFFFF";
const BACKGROUND = "#F8FAFC";
const TEXT = "#17212B";

describe("approved brand colours", () => {
  it.each(Object.entries(PRIMARY_OPTIONS))("primary %s keeps white text and headings readable", (color, o) => {
    expect(contrastRatio(color, WHITE)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(o.hover, WHITE)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(color, BACKGROUND)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(color, o.soft)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(Object.entries(SECONDARY_OPTIONS))("secondary %s pairs with dark text, and its ink colour reads on light surfaces", (color, o) => {
    // Accent buttons put body text on the secondary fill.
    expect(contrastRatio(color, TEXT)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(o.ink, WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(o.ink, o.soft)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps secondary text readable on the page background", () => {
    expect(contrastRatio("#64748B", BACKGROUND)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#64748B", WHITE)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("themeToCssVars", () => {
  it("uses stored approved colours", () => {
    const vars = themeToCssVars({ primary: "#0B4F4A", secondary: "#D9653B" });
    expect(vars["--brand-primary"]).toBe("#0B4F4A");
    expect(vars["--brand-secondary-ink"]).toBe("#A3431F");
  });

  it("ignores colours outside the approved set", () => {
    const vars = themeToCssVars({ primary: "#FF00FF", secondary: "red; background:url(x)" });
    expect(vars["--brand-primary"]).toBe("#173B57");
    expect(vars["--brand-secondary"]).toBe("#18A999");
  });

  it("handles a missing theme", () => {
    expect(themeToCssVars(null)["--brand-primary"]).toBe("#173B57");
  });
});

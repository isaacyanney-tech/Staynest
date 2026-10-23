import { describe, expect, it } from "vitest";
import { formatDistance, formatMoney, slugify } from "./format";

describe("format", () => {
  it("formats cedis with a readable code", () => {
    expect(formatMoney(6500)).toBe("GHS 6,500");
    expect(formatMoney(0)).toBe("GHS 0");
    expect(formatMoney(null)).toBe("Price on request");
  });

  it("formats distances", () => {
    expect(formatDistance(0.65)).toBe("650 m from campus");
    expect(formatDistance(2.345)).toBe("2.3 km from campus");
    expect(formatDistance(null)).toBeNull();
  });

  it("makes URL-safe slugs", () => {
    expect(slugify("  Kotei Ladies' Lodge (Annex) ")).toBe("kotei-ladies-lodge-annex");
    expect(slugify("Ébène Hall")).toBe("ebene-hall");
  });
});

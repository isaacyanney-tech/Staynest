import { describe, expect, it } from "vitest";
import { parseSearchParams, sanitizeTerm, toQueryString } from "./search-params";

describe("parseSearchParams", () => {
  it("returns defaults for an empty query", () => {
    expect(parseSearchParams({})).toMatchObject({ sort: "recommended", page: 1, amenities: [], available: false, verified: false });
  });

  it("parses every filter", () => {
    const f = parseSearchParams({
      q: "legon",
      university: "knust",
      min: "1000",
      max: "6000",
      occupancy: "2",
      gender: "female",
      amenities: ["wifi", "security"],
      available: "1",
      verified: "1",
      sort: "price_asc",
      page: "3",
    });
    expect(f).toEqual({
      q: "legon",
      university: "knust",
      min: 1000,
      max: 6000,
      occupancy: 2,
      gender: "female",
      amenities: ["wifi", "security"],
      available: true,
      verified: true,
      sort: "price_asc",
      page: 3,
    });
  });

  it("drops malformed values instead of failing", () => {
    const f = parseSearchParams({ university: "../etc", min: "-5", gender: "robot", sort: "drop table", page: "9999", amenities: "wifi,unknown" });
    expect(f.university).toBeUndefined();
    expect(f.min).toBeUndefined();
    expect(f.gender).toBeUndefined();
    expect(f.sort).toBe("recommended");
    expect(f.page).toBe(1);
    expect(f.amenities).toEqual(["wifi"]);
  });

  it("swaps a reversed price range", () => {
    expect(parseSearchParams({ min: "5000", max: "1000" })).toMatchObject({ min: 1000, max: 5000 });
  });
});

describe("toQueryString", () => {
  it("round-trips through the parser", () => {
    const f = parseSearchParams({ university: "ucc", amenities: ["wifi", "gym"], verified: "1", page: "2" });
    const qs = toQueryString(f);
    expect(qs).toBe("?university=ucc&amenities=wifi%2Cgym&verified=1&page=2");
    expect(parseSearchParams(Object.fromEntries(new URLSearchParams(qs)))).toEqual(f);
  });

  it("omits defaults", () => {
    expect(toQueryString({ sort: "recommended", page: 1 })).toBe("");
  });
});

describe("sanitizeTerm", () => {
  it("strips characters that could break a PostgREST filter", () => {
    expect(sanitizeTerm("legon),status.eq.draft")).toBe("legon status eq draft");
    expect(sanitizeTerm("  St. Mary's   %_* hostel ")).toBe("St Mary's hostel");
  });
});

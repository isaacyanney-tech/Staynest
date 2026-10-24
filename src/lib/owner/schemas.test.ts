import { describe, expect, it } from "vitest";
import { altSchema, captionSchema, hostelFromForm, inspectionResponseSchema, roomFromForm } from "./schemas";

const form = (entries: Record<string, string | string[]>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) for (const item of [v].flat()) fd.append(k, item);
  return fd;
};

const hostel = { name: "  Legon View Hostel ", area: "Okponglo", city: "Accra", gender: "mixed" };

describe("hostelFromForm", () => {
  it("trims text and turns blanks into nulls", () => {
    const r = hostelFromForm(form({ ...hostel, universityId: "", distanceKm: "", contactPhone: "" }));
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ name: "Legon View Hostel", universityId: null, distanceKm: null, contactPhone: null, summary: "" });
  });
  it("keeps only known amenities, once each", () => {
    const r = hostelFromForm(form({ ...hostel, amenities: ["wifi", "wifi", "helipad", "cctv"] }));
    expect(r.data?.amenities).toEqual(["wifi", "cctv"]);
  });
  it("rounds distance and rejects bad values", () => {
    expect(hostelFromForm(form({ ...hostel, distanceKm: "1.2345" })).data?.distanceKm).toBe(1.23);
    const bad = hostelFromForm(form({ ...hostel, distanceKm: "-1", gender: "robots", contactPhone: "call me", universityId: "knust" }));
    expect(bad.success).toBe(false);
    const paths = bad.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["distanceKm", "gender", "contactPhone", "universityId"]));
  });
  it("requires a name, area and city", () => {
    const r = hostelFromForm(form({ gender: "mixed" }));
    expect(r.error!.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(["name", "area", "city"]));
  });
});

describe("roomFromForm", () => {
  const room = { name: "Two in a room", occupancy: "2", price: "6500", period: "academic_year", total: "10", available: "4" };
  it("parses numbers from the form", () => {
    expect(roomFromForm(form(room)).data).toMatchObject({ occupancy: 2, price: 6500, total: 10, available: 4, description: "" });
  });
  it("does not allow more available rooms than exist", () => {
    const r = roomFromForm(form({ ...room, available: "11" }));
    expect(r.error!.issues[0]).toMatchObject({ path: ["available"] });
  });
  it("rejects zero prices, fractional occupancy and unknown periods", () => {
    const r = roomFromForm(form({ ...room, price: "0", occupancy: "1.5", period: "week" }));
    expect(r.error!.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(["price", "occupancy", "period"]));
  });
});

describe("photo text", () => {
  it("needs a real description and allows an empty caption", () => {
    expect(altSchema.safeParse("ok").success).toBe(false);
    expect(altSchema.parse("  Shared kitchen  ")).toBe("Shared kitchen");
    expect(captionSchema.parse("   ")).toBeNull();
  });
});

describe("inspectionResponseSchema", () => {
  const id = "6f1c1f9e-8a51-4d5c-9b6e-0d6f3b9b1a11";
  it("needs a date to reschedule and a reason to decline", () => {
    expect(inspectionResponseSchema.safeParse({ id, decision: "rescheduled", reply: "", proposedDate: "" }).success).toBe(false);
    expect(inspectionResponseSchema.safeParse({ id, decision: "declined", reply: "", proposedDate: "" }).success).toBe(false);
    expect(inspectionResponseSchema.safeParse({ id, decision: "declined", reply: "Fully booked", proposedDate: "" }).success).toBe(true);
    expect(inspectionResponseSchema.parse({ id, decision: "accepted", reply: "", proposedDate: "" }).proposedDate).toBeNull();
  });
  it("only accepts owner decisions", () => {
    expect(inspectionResponseSchema.safeParse({ id, decision: "cancelled", reply: "", proposedDate: "" }).success).toBe(false);
  });
});

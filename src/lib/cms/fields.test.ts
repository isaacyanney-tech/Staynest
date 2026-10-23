import { describe, expect, it } from "vitest";
import { SECTION_SCHEMAS, type SectionType } from "./schemas";
import { emptyItem, sameContent, SECTION_FIELDS, sectionState, withDefaults, type FieldSpec } from "./fields";

const types = Object.keys(SECTION_SCHEMAS) as SectionType[];

function shapeKeys(type: SectionType): string[] {
  return Object.keys((SECTION_SCHEMAS[type] as unknown as { shape: Record<string, unknown> }).shape).sort();
}

describe("section fields", () => {
  it.each(types)("%s: the editor covers exactly the schema's fields", (type) => {
    expect(SECTION_FIELDS[type].map((f) => f.name).sort()).toEqual(shapeKeys(type));
  });

  it.each(types)("%s: blank content is filled in without inventing values", (type) => {
    const content = withDefaults(SECTION_FIELDS[type], {});
    expect(Object.keys(content).sort()).toEqual(shapeKeys(type));
    // Blank required text must be rejected rather than published.
    const hasRequired = SECTION_FIELDS[type].some((f) => "required" in f && f.required) || SECTION_FIELDS[type].some((f) => f.kind === "link" && !f.optional);
    expect(SECTION_SCHEMAS[type].safeParse(content).success).toBe(!hasRequired);
  });

  it("keeps stored values and fills missing list item fields", () => {
    const fields = SECTION_FIELDS.how_it_works;
    const out = withDefaults(fields, { heading: "How", steps: [{ title: "Search" }], extra: 1 });
    expect(out).toEqual({ heading: "How", steps: [{ title: "Search", body: "" }], extra: 1 });
  });

  it("new list items start empty", () => {
    const list = SECTION_FIELDS.faq.find((f) => f.name === "items") as Extract<FieldSpec, { kind: "list" }>;
    expect(emptyItem(list.fields)).toEqual({ q: "", a: "" });
  });

  it("filled-in hero content passes the schema", () => {
    const content = withDefaults(SECTION_FIELDS.hero, { heading: "Find a hostel", primaryCta: { label: "Search", href: "/hostels" } });
    expect(SECTION_SCHEMAS.hero.safeParse(content).success).toBe(true);
  });
});

describe("publishing state", () => {
  it("compares content regardless of key order", () => {
    expect(sameContent({ a: 1, b: [{ x: 1, y: 2 }] }, { b: [{ y: 2, x: 1 }], a: 1 })).toBe(true);
    expect(sameContent({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
  });

  it("classifies sections", () => {
    expect(sectionState(null, undefined)).toBe("empty");
    expect(sectionState(null, { a: 1 })).toBe("draft");
    expect(sectionState({ a: 1 }, undefined)).toBe("live");
    expect(sectionState({ a: 1 }, { a: 1 })).toBe("live");
    expect(sectionState({ a: 1 }, { a: 2 })).toBe("changed");
  });
});

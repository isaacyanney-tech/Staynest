import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it.each(["/dashboard", "/hostels/legon-courtyard?x=1", "/admin"])("allows %s", (v) => {
    expect(safeNext(v)).toBe(v);
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "dashboard", "/a\nb", "", null, undefined])(
    "rejects %s",
    (v) => {
      expect(safeNext(v as string)).toBeNull();
    },
  );
});

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Netlify's firewall rejects server action requests whose form field names
// contain "_response" (a React2Shell exploit marker) with a bare 403. React
// sends fields as "_1_<name>", so a field called "response" never reaches the
// app. Keep such names out of every form.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("form field names", () => {
  it("never use names the hosting firewall blocks", () => {
    const offenders = sourceFiles(join(process.cwd(), "src")).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/name=["{`']+([^"'`}]+)/g)]
        .map((m) => m[1])
        .filter((name) => /response|__proto__|constructor|prototype/i.test(name))
        .map((name) => `${file}: ${name}`),
    );
    expect(offenders).toEqual([]);
  });
});

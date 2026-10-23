import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Password1234";
export const users = {
  student: "student@e2e.test",
  owner: "owner@e2e.test",
  admin: "admin@e2e.test",
};

/** Fails on any WCAG 2.1 A/AA violation. */
export async function expectAccessible(page: Page) {
  // Let entrance animations settle so contrast is measured at full opacity.
  // Scroll-driven animations never "finish", so only time-based ones are awaited.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.timeline instanceof DocumentTimeline && a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")})`);
  expect(summary, "axe violations").toEqual([]);
}

export async function signIn(page: Page, email: string, path = "/sign-in") {
  await page.goto(path);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/**
 * Full-page screenshot for visual review. Scroll-driven entrance animations
 * keep off-screen sections transparent until scrolled to, so they are turned
 * off with reduced motion first.
 */
export async function screenshot(page: Page, name: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  await page.emulateMedia({ reducedMotion: null });
}

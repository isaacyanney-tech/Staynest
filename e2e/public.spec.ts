import { expect, test } from "@playwright/test";
import { expectAccessible, screenshot } from "./support/helpers";

test.describe("public pages", () => {
  test("homepage shows CMS hero, search and labelled sample listings @responsive", async ({ page }, info) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("search").or(page.locator("form[action='/hostels']")).first()).toBeVisible();
    const featured = page.locator("article").filter({ hasText: "(sample)" });
    await expect(featured.first()).toBeVisible();
    await expect(featured.first().getByText("Illustrative")).toBeVisible();
    await expectAccessible(page);
    await screenshot(page, `home-${info.project.name}`);
  });

  test("search filters by university and sorts by price @responsive", async ({ page }, info) => {
    await page.goto("/hostels?university=knust");
    await expect(page.getByRole("heading", { name: /hostels? near KNUST/ })).toBeVisible();
    const names = await page.locator("article h3").allTextContents();
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n).toMatch(/Ayeduase|Kotei/);
    await expectAccessible(page);
    await screenshot(page, `search-${info.project.name}`);

    await page.goto("/hostels?sort=price_asc");
    const prices = await page.locator("article .font-display").allTextContents();
    const values = prices.map((p) => Number(p.replace(/[^0-9]/g, "")));
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  test("filter form submits as a shareable URL", async ({ page }) => {
    await page.goto("/hostels");
    const panel = page.locator("aside form").last();
    await panel.getByLabel("Who can stay").selectOption("female");
    await panel.getByRole("button", { name: "Show hostels" }).click();
    await expect(page).toHaveURL(/gender=female/);
    await expect(page.locator("article h3")).toHaveText(["Kotei Ladies Lodge (sample)"]);
  });

  test("no results shows a way out", async ({ page }) => {
    await page.goto("/hostels?min=900000");
    await expect(page.getByText("No hostels match these filters")).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hostels$/);
  });

  test("sample listing is labelled and cannot be inspected", async ({ page }) => {
    await page.goto("/hostels/demo-legon-courtyard");
    await expect(page.getByText("Illustrative listing", { exact: true })).toBeVisible();
    await expect(page.getByText("Inspections are turned off for illustrative listings.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rooms and prices" })).toBeVisible();
    await expectAccessible(page);
  });

  test("hostel gallery opens and closes with the keyboard @responsive", async ({ page }, info) => {
    await page.goto("/hostels/demo-legon-courtyard");
    await page.getByRole("button", { name: /View 2 photos/ }).click();
    const dialog = page.getByRole("dialog", { name: /photos/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("1 / 2")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByText("2 / 2")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await screenshot(page, `hostel-${info.project.name}`);
  });

  test("signed-out visitors are asked to sign in before requesting an inspection", async ({ page }) => {
    await page.goto("/hostels/okponglo-test-house");
    await expect(page.getByText("Verified by StayNest")).toBeVisible();
    await page.getByRole("link", { name: "Sign in to request an inspection" }).click();
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fhostels%2Fokponglo-test-house/);
  });

  test("content pages come from the CMS", async ({ page }) => {
    for (const [path, heading] of [
      ["/about", /About/],
      ["/safety", /safe/i],
      ["/terms", /Terms/],
      ["/privacy", /Privacy/],
      ["/contact", /StayNest team/],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }
    await page.goto("/faq");
    const first = page.locator("details").first();
    await first.locator("summary").click();
    await expect(first).toHaveAttribute("open", "");
    await expectAccessible(page);
  });

  test("pricing lists plans from the database", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { level: 2, name: "Starter" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Standard" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Premium" })).toBeVisible();
    await expect(page.getByText("GHS 150")).toBeVisible();
    await expectAccessible(page);
  });

  test("unknown pages show a helpful 404", async ({ page }) => {
    // The page streams, so the status is already sent; Next.js marks it noindex instead.
    await page.goto("/hostels/does-not-exist");
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
    await expect(page.getByRole("heading", { name: "We could not find that page" })).toBeVisible();
  });
});

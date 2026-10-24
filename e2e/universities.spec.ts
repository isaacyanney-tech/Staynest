import { expect, test } from "@playwright/test";
import { expectAccessible, screenshot } from "./support/helpers";

test.describe("university pages and search engine files", () => {
  test("index lists campuses grouped by region @responsive", async ({ page }, info) => {
    await page.goto("/universities");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /KNUST/ }).first()).toBeVisible();
    await expectAccessible(page);
    await screenshot(page, `universities-${info.project.name}`);
  });

  test("campus page has its own title, description and hostels @responsive", async ({ page }, info) => {
    await page.goto("/universities/knust");
    await expect(page.getByRole("heading", { level: 1, name: "Student hostels near KNUST" })).toBeVisible();
    await expect(page).toHaveTitle(/Student hostels near KNUST/);
    await expect(page.locator("head meta[name='description']")).toHaveAttribute("content", /Compare hostels near/);
    await expect(page.locator("head link[rel='canonical']")).toHaveAttribute("href", /\/universities\/knust$/);
    await expect(page.getByRole("link", { name: /Ayeduase Billing House/ })).toBeVisible();
    await expectAccessible(page);
    await screenshot(page, `university-${info.project.name}`);
  });

  test("unknown campus shows not found and is kept out of search results", async ({ page }) => {
    // Partial prerendering sends the page shell before the lookup finishes, so
    // Next marks a missing campus with noindex rather than a 404 status.
    await page.goto("/universities/not-a-real-campus");
    await expect(page.locator("meta[name='robots'][content='noindex']").first()).toBeAttached();
    await expect(page.getByRole("heading", { name: /Student hostels near/ })).toHaveCount(0);
  });

  test("homepage campus card and footer link reach university pages", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("a[href='/universities/knust']").first();
    await card.click();
    await expect(page).toHaveURL(/\/universities\/knust$/);
    await page.getByRole("contentinfo").getByRole("link", { name: "Hostels by university" }).click();
    await expect(page).toHaveURL(/\/universities$/);
  });

  test("sitemap lists real hostels and campuses but not samples or private pages", async ({ request, baseURL }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBe(true);
    const xml = await res.text();
    expect(xml).toContain(`${baseURL}/universities/knust`);
    expect(xml).toContain(`${baseURL}/hostels/okponglo-test-house`);
    expect(xml).not.toContain("/demo-");
    expect(xml).not.toContain("/dashboard");
    expect(xml).not.toContain("/admin");
  });

  test("robots.txt keeps private areas out and points at the sitemap", async ({ request, baseURL }) => {
    const text = await (await request.get("/robots.txt")).text();
    for (const path of ["/dashboard", "/admin", "/api"]) expect(text).toContain(`Disallow: ${path}`);
    expect(text).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
  });
});

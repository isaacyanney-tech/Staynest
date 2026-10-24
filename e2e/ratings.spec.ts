import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, screenshot, signIn } from "./support/helpers";

const hostel = "/hostels/okponglo-test-house";
const ratings = (page: Page) => page.locator("section[aria-labelledby='ratings-heading']");

test.describe.configure({ mode: "serial" });

test.describe("hostel ratings", () => {
  test("a student without an accepted inspection cannot rate", async ({ page }) => {
    await signIn(page, "student@e2e.test");
    await page.waitForURL(/\/dashboard/);
    await page.goto(hostel);
    await expect(ratings(page).getByText("No ratings yet.")).toBeVisible();
    await expect(ratings(page).getByText(/Once the owner accepts your inspection request/)).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Your rating" })).toHaveCount(0);
  });

  test("a student whose inspection was accepted rates, then edits the rating", async ({ page }) => {
    await signIn(page, "rater@e2e.test");
    await expect(page).toHaveURL(/\/dashboard\/student$/);
    await page.getByRole("link", { name: "Rate this hostel" }).click();
    await expect(page).toHaveURL(new RegExp(`${hostel}#ratings-heading$`));

    const group = page.getByRole("radiogroup", { name: "Your rating" });
    await expect(group).toBeVisible();
    // Posting without stars is refused.
    await page.getByRole("button", { name: "Post my rating" }).click();
    await expect(page.getByText("Choose a star rating.").first()).toBeVisible();

    await group.getByRole("radio", { name: "4 of 5, Very good" }).click();
    await expect(group.getByRole("radio", { name: "4 of 5, Very good" })).toHaveAttribute("aria-checked", "true");
    await page.getByLabel("What should other students know?").fill("Water never ran out and the owner fixed a broken lock the same day.");
    await page.getByRole("button", { name: "Post my rating" }).click();
    await expect(page.getByText("Thanks. Your rating is live.")).toBeVisible();

    const section = ratings(page);
    await expect(section.getByText("4.0", { exact: true })).toBeVisible();
    await expect(section.getByText("1 rating", { exact: true })).toBeVisible();
    const posted = section.getByRole("listitem").filter({ hasText: "Akosua F." });
    await expect(posted.getByText(/Water never ran out/)).toBeVisible();
    await expectAccessible(page);

    // Keyboard: arrow right moves to five stars.
    await group.getByRole("radio", { name: "4 of 5, Very good" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(group.getByRole("radio", { name: "5 of 5, Excellent" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Update my rating" }).click();
    await expect(page.getByText("Thanks. Your rating is live.")).toBeVisible();
    await expect(section.getByText("5.0", { exact: true })).toBeVisible();
    await screenshot(page, "hostel-ratings");
  });

  test("ratings show on hostel cards and the homepage", async ({ page }) => {
    await page.goto("/hostels");
    const card = page.locator("article").filter({ hasText: "Okponglo Test House" });
    await expect(card.getByText("5.0", { exact: true })).toBeVisible();
    await expect(card.getByText(/1 rating, average 5.0 out of 5/)).toBeAttached();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What students say after inspecting" })).toBeVisible();
    const quote = page.locator("figure").filter({ hasText: "Water never ran out" });
    await expect(quote).toBeVisible();
    await quote.getByRole("link", { name: "Okponglo Test House" }).click();
    await expect(page).toHaveURL(new RegExp(`${hostel}$`));
  });

  test("an administrator hides a rating with a reason and can show it again", async ({ page }) => {
    await signIn(page, "admin@e2e.test", "/admin/login");
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Ratings" }).click();
    await expect(page).toHaveURL(/\/admin\/ratings$/);
    const row = page.getByRole("listitem").filter({ hasText: "Water never ran out" });
    await row.getByRole("button", { name: "Hide rating" }).click();
    await expect(row.getByText(/Say why the rating is hidden/)).toBeVisible();
    await row.getByLabel("Reason for hiding").fill("Test of moderation");
    await row.getByRole("button", { name: "Hide rating" }).click();
    await expect(page.getByText("Rating hidden. It no longer counts towards the average.")).toBeVisible();
    await expect(row.getByText("Hidden", { exact: true })).toBeVisible();
    await expectAccessible(page);

    await page.goto(hostel);
    await expect(ratings(page).getByText("No ratings yet.")).toBeVisible();
    await expect(page.getByText(/Water never ran out/)).toHaveCount(0);

    await page.goto("/admin/ratings?show=hidden");
    await expect(page.getByRole("listitem").filter({ hasText: "Water never ran out" })).toBeVisible();
    await page.goto("/admin/ratings");
    await page.getByRole("listitem").filter({ hasText: "Water never ran out" }).getByRole("button", { name: "Show again" }).click();
    await expect(page.getByText("Rating is visible again.")).toBeVisible();
    await page.goto(hostel);
    await expect(ratings(page).getByText("5.0", { exact: true })).toBeVisible();
  });

  test("the student can remove their rating", async ({ page }) => {
    await signIn(page, "rater@e2e.test");
    await page.waitForURL(/\/dashboard/);
    await page.goto(hostel);
    await page.getByRole("button", { name: "Remove my rating" }).click();
    await expect(ratings(page).getByText("No ratings yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Post my rating" })).toBeVisible();
  });
});

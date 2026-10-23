import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, screenshot, signIn, users } from "./support/helpers";

const approveId = "e2e10000-0000-4000-8000-000000000002";
const rejectId = "e2e10000-0000-4000-8000-000000000003";
const verificationId = "e2e20000-0000-4000-8000-000000000001";

async function asAdmin(page: Page) {
  await signIn(page, users.admin, "/admin/login");
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe("admin console", () => {
  test("overview and queues are accessible @responsive", async ({ page }, info) => {
    await asAdmin(page);
    await expect(page.getByRole("link", { name: /Listings waiting for review/ })).toContainText("2");
    await expect(page.getByRole("link", { name: /Verification requests to review/ })).toContainText("1");
    await expectAccessible(page);
    await screenshot(page, `admin-overview-${info.project.name}`);

    await page.goto("/admin/listings");
    await expect(page.getByRole("link", { name: "Kotei Review Lodge" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Bomso Review Hostel" })).toBeVisible();
    await expectAccessible(page);
    await screenshot(page, `admin-listings-${info.project.name}`);
  });

  test("approving a listing publishes it to students", async ({ page }) => {
    await page.goto("/hostels/kotei-review-lodge");
    await expect(page.getByRole("heading", { name: "Kotei Review Lodge" })).toHaveCount(0);

    await asAdmin(page);
    await page.goto(`/admin/listings/${approveId}`);
    await expect(page.getByRole("heading", { name: "Kotei Review Lodge", level: 1 })).toBeVisible();
    await expect(page.getByText("No photos", { exact: true })).toBeVisible();
    await expectAccessible(page);

    await page.getByRole("radio", { name: /Approve and publish/ }).check();
    await page.getByRole("button", { name: "Confirm: approve and publish" }).click();
    await expect(page.getByText("Published. The listing is now live.")).toBeVisible();

    await page.goto("/hostels/kotei-review-lodge");
    await expect(page.getByRole("heading", { name: "Kotei Review Lodge", level: 1 })).toBeVisible();
  });

  test("requesting changes needs a note that the owner then sees", async ({ page }) => {
    await asAdmin(page);
    await page.goto(`/admin/listings/${rejectId}`);
    await expect(page.getByText("No summary")).toBeVisible();
    await page.getByRole("radio", { name: /Request changes/ }).check();
    await page.getByRole("button", { name: "Confirm: request changes" }).click();
    await expect(page.getByText("Tell the owner what to change, in a sentence or two.")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Request changes/ })).toBeChecked();

    await page.getByLabel(/Note to the owner/).fill("Please add a summary, room prices and at least three photos.");
    await page.getByRole("button", { name: "Confirm: request changes" }).click();
    // The form is replaced by the note the owner now sees on their listing.
    await expect(page.getByText("Waiting for the owner to make changes and submit it again.")).toBeVisible();
    await expect(page.getByText("Please add a summary, room prices and at least three photos.")).toBeVisible();

    await page.goto("/admin/activity?entity=hostels");
    await expect(page.getByText("Esi Admin · Moved a listing to changes requested").first()).toBeVisible();
    await expectAccessible(page);
  });

  test("verification documents open through a short-lived link and the decision is recorded", async ({ page }) => {
    await asAdmin(page);
    await page.goto(`/admin/verification/${verificationId}`);
    await expect(page.getByText("Land title is in my name.")).toBeVisible();
    const doc = page.getByRole("link", { name: /Open land-title\.pdf/ });
    await expect(doc).toHaveAttribute("href", /\/storage\/v1\/object\/sign\/verification-docs\/.+\?token=/);
    await expectAccessible(page);

    await page.getByRole("radio", { name: /Ask for more/ }).check();
    await page.getByLabel(/Note to the owner/).fill("The title is cut off. Please upload all pages.");
    await page.getByRole("button", { name: "Confirm: ask for more" }).click();
    await expect(page.getByText("Sent to the owner with your question.")).toBeVisible();

    await page.goto("/admin/verification?status=needs_info");
    await expect(page.getByRole("link", { name: "Kotei Review Lodge" })).toBeVisible();
  });

  test("admin changes an account's role but not their own", async ({ page }) => {
    await asAdmin(page);
    await page.goto("/admin/users?q=kwame");
    const row = page.getByRole("listitem").filter({ hasText: "student2@e2e.test" });
    await expect(row).toBeVisible();
    await row.getByLabel("Role for Kwame Adjei").selectOption("owner");
    await row.getByRole("button", { name: "Save" }).click();
    await expect(row.getByText("Access updated.")).toBeVisible();

    await page.goto("/admin/users?role=owner");
    await expect(page.getByText("student2@e2e.test")).toBeVisible();

    await page.goto("/admin/users?q=esi");
    const self = page.getByRole("listitem").filter({ hasText: "admin@e2e.test" });
    await expect(self.getByText("Another administrator must change your own access.")).toBeVisible();
    await expect(self.getByRole("combobox")).toHaveCount(0);
    await expectAccessible(page);
  });

  test("plan prices and business settings are validated and saved", async ({ page }, info) => {
    await asAdmin(page);
    await page.goto("/admin/plans");
    const standard = page.getByRole("region", { name: "Standard" });
    await standard.getByLabel("Price (GHS)").fill("-5");
    await standard.getByRole("button", { name: "Save Standard" }).click();
    await expect(standard.getByText("The price cannot be negative.")).toBeVisible();
    await standard.getByLabel("Price (GHS)").fill("175");
    await standard.getByRole("button", { name: "Save Standard" }).click();
    await expect(standard.getByText("Saved Standard.")).toBeVisible();
    await expectAccessible(page);
    await screenshot(page, `admin-plans-${info.project.name}`);

    const starter = page.getByRole("region", { name: "Starter" });
    await starter.getByRole("checkbox", { name: "Owners can choose this plan" }).uncheck();
    await starter.getByRole("button", { name: "Save Starter" }).click();
    await expect(starter.getByText("The default plan must stay active.", { exact: false })).toBeVisible();

    await page.goto("/pricing");
    await expect(page.getByRole("main")).toContainText("175");

    await page.goto("/admin/settings");
    const slots = page.getByRole("listitem").filter({ hasText: "Featured hostels on the homepage" });
    await slots.getByLabel("Featured hostels on the homepage").fill("2.5");
    await slots.getByRole("button", { name: "Save" }).click();
    await expect(slots.getByText("Use a whole number.")).toBeVisible();
    await slots.getByLabel("Featured hostels on the homepage").fill("4");
    await slots.getByRole("button", { name: "Save" }).click();
    await expect(slots.getByText("Saved.")).toBeVisible();
    await expectAccessible(page);

    await page.goto("/admin/activity?entity=business_settings");
    await page.getByText("1 field changed").first().click();
    await expect(page.getByRole("definition").filter({ hasText: "→ 4" })).toBeVisible();
  });
});

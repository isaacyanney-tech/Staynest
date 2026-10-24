import { expect, test } from "@playwright/test";
import { expectAccessible, screenshot, signIn, users } from "./support/helpers";

test.describe("signed-in account", () => {
  test("the header account menu links to the dashboard, profile and sign out @responsive", async ({ page, isMobile }, info) => {
    await signIn(page, users.owner);
    await expect(page).toHaveURL(/\/dashboard\/owner$/);
    await page.goto("/");
    const header = page.getByRole("banner");

    if (isMobile) {
      await header.getByRole("button", { name: "Open menu" }).click();
      await expect(header.getByText("Signed in as Kofi Owusu")).toBeVisible();
    } else {
      await header.getByRole("button", { name: /^Kofi.*account menu$/ }).click();
      await expect(header.getByText("owner@e2e.test")).toBeVisible();
    }
    await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Plan and billing" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Profile and password" })).toBeVisible();
    await expectAccessible(page);
    await screenshot(page, `account-menu-${info.project.name}`);

    await header.getByRole("button", { name: "Sign out" }).click();
    // The page was already "/", so wait for the signed-in menu to go rather
    // than for the address to change.
    await expect(header.getByRole("button", { name: /account menu$/ })).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
    if (isMobile) await header.getByRole("button", { name: "Open menu" }).click();
    await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("signed-in owners skip the sign-up and sign-in pages", async ({ page }) => {
    await signIn(page, users.owner);
    await expect(page).toHaveURL(/\/dashboard\/owner$/);

    // "For owners" in the header points at owner sign-up.
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "For owners" }).click();
    await expect(page).toHaveURL(/\/dashboard\/owner$/);

    // A paid plan on the pricing page leads to billing.
    await page.goto("/pricing");
    await page.getByRole("link", { name: "Choose Standard" }).click();
    await expect(page).toHaveURL(/\/dashboard\/owner\/billing$/);
    await expect(page.getByRole("heading", { level: 1, name: "Plan and billing" })).toBeVisible();

    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/dashboard\/owner$/);
    // A next= for a page the role cannot see still lands somewhere sensible.
    await page.goto("/sign-in?next=/admin");
    await expect(page).toHaveURL(/\/dashboard\/owner$/);
  });

  test("anyone can update their name, phone and password", async ({ page }) => {
    await signIn(page, users.student);
    await expect(page).toHaveURL(/\/dashboard\/student$/);
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: /account menu/ }).click();
    await page.getByRole("link", { name: "Profile and password" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Profile and password" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(users.student);
    await expectAccessible(page);

    await page.getByLabel("Full name").fill("A");
    await page.getByLabel(/Phone number/).fill("call me");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Enter your full name.")).toBeVisible();
    await expect(page.getByText("Use digits, spaces, + and brackets only", { exact: false })).toBeVisible();
    await expect(page.getByLabel(/Phone number/)).toHaveValue("call me");

    await page.getByLabel("Full name").fill("Ama K. Mensah");
    await page.getByLabel(/Phone number/).fill("+233 24 111 2222");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Saved. Your details are up to date.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Full name")).toHaveValue("Ama K. Mensah");
    await expect(page.getByLabel(/Phone number/)).toHaveValue("+233 24 111 2222");

    const password = page.getByRole("region", { name: "Change password" });
    await password.getByLabel("New password", { exact: true }).fill("NewPassword123");
    await password.getByLabel("Confirm new password").fill("NewPassword124");
    await password.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("The passwords do not match.")).toBeVisible();
    await password.getByLabel("New password", { exact: true }).fill("NewPassword123");
    await password.getByLabel("Confirm new password").fill("NewPassword123");
    await password.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Password changed. Use the new one next time you sign in.")).toBeVisible();

    // Put the seeded name back and clear the phone for other tests.
    await page.getByLabel("Full name").fill("Ama Mensah");
    await page.getByLabel(/Phone number/).fill("");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Saved. Your details are up to date.")).toBeVisible();
  });
});

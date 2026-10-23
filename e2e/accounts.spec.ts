import { expect, test } from "@playwright/test";
import { expectAccessible, screenshot, PASSWORD, signIn, users } from "./support/helpers";

test.describe("accounts and roles", () => {
  test("sign-in and sign-up screens are accessible @responsive", async ({ page }, info) => {
    await page.goto("/sign-in");
    await expectAccessible(page);
    await page.goto("/sign-up?role=owner");
    await expect(page.getByRole("radio", { name: /I own a hostel/ })).toBeChecked();
    await expectAccessible(page);
    await screenshot(page, `sign-up-${info.project.name}`);
  });

  test("wrong password shows a clear error", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(users.student);
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That email and password do not match an account.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(users.student);
  });

  test("sign-up validates fields, then asks to confirm the email", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter your full name.")).toBeVisible();
    await expect(page.getByText("Accept the terms to continue.")).toBeVisible();

    await page.getByLabel("Full name").fill("Yaw Boateng");
    await page.getByLabel("Email").fill("new.student@e2e.test");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use at least 10 characters.")).toBeVisible();

    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Check new.student@e2e.test for a link to confirm your account.")).toBeVisible();
  });

  test("the chosen account type survives a form error", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByText("I own a hostel").click();
    await expect(page.getByRole("radio", { name: /I own a hostel/ })).toBeChecked();
    await page.getByLabel("Full name").fill("Efua Owner");
    await page.getByLabel("Email").fill("efua.owner@e2e.test");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
    // React resets the form after a submission; the radio must not fall back to "student".
    await expect(page.getByRole("radio", { name: /I own a hostel/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: /I am a student/ })).not.toBeChecked();
  });

  test("student requests an inspection, sees it in the dashboard and cancels it", async ({ page }) => {
    await signIn(page, users.student, "/sign-in?next=/hostels/okponglo-test-house");
    await expect(page).toHaveURL(/^[^?]+\/hostels\/okponglo-test-house$/);

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");

    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    await page.getByLabel("Preferred date").fill(tomorrow);
    await page.getByLabel("Time").selectOption("afternoon");
    await page.getByLabel(/Message to the owner/).fill("Is there water storage?");
    await page.getByRole("button", { name: "Request an inspection" }).click();
    await expect(page.getByText(/Request sent/)).toBeVisible();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard\/student$/);
    const request = page.locator("li").filter({ hasText: "Okponglo Test House" }).first();
    await expect(request.getByText("Waiting for owner")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Saved hostels" })).toBeVisible();
    await expectAccessible(page);

    await request.getByRole("button", { name: "Cancel request" }).click();
    await expect(request.getByText("Cancelled")).toBeVisible();
  });

  test("a second request for the same hostel is refused by the database", async ({ page }) => {
    await signIn(page, users.student, "/sign-in?next=/hostels/okponglo-test-house");
    await expect(page).toHaveURL(/^[^?]+\/hostels\/okponglo-test-house$/);
    const date = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
    for (const expected of [/Request sent/, /already have an open inspection request/]) {
      await page.goto("/hostels/okponglo-test-house");
      await page.getByLabel("Preferred date").fill(date);
      await page.getByRole("button", { name: "Request an inspection" }).click();
      await expect(page.getByText(expected)).toBeVisible();
    }
  });

  test("owners see their listings and requests, not the student dashboard", async ({ page }) => {
    await signIn(page, users.owner);
    await expect(page).toHaveURL(/\/dashboard\/owner$/);
    await expect(page.getByRole("region", { name: "Listings" }).getByText("Okponglo Test House")).toBeVisible();
    await expect(page.getByText("Ama Mensah").first()).toBeVisible();
    await page.goto("/dashboard/student");
    await expect(page).toHaveURL(/\/dashboard\/owner$/);
  });

  test("dashboards and admin redirect signed-out visitors", async ({ page }) => {
    await page.goto("/dashboard/student");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard%2Fstudent/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin/);
  });

  test("admin sign-in rejects non-admins without revealing why", async ({ page }) => {
    await signIn(page, users.student, "/admin/login");
    await expect(page.getByText("That email and password do not match an account.")).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("admin signs in to the admin overview and can sign out", async ({ page }) => {
    await signIn(page, users.admin, "/admin/login");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByText("Published listings")).toBeVisible();
    await expectAccessible(page);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("next= cannot redirect off-site", async ({ page }) => {
    await signIn(page, users.student, "/sign-in?next=//evil.example");
    await expect(page).toHaveURL(/\/dashboard\/student$/);
  });
});

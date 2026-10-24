import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, screenshot, signIn, users } from "./support/helpers";
import { fakePaystack, paystackSignature } from "./support/paystack";

// Payments run against a local stand-in for Paystack (e2e/support/fake-paystack.mjs)
// that serves a checkout page and answers /transaction/verify like the real API.
// The tests build on each other's purchases, so they run in order.
test.describe.configure({ mode: "serial" });

const billingOwner = "billing.owner@e2e.test";

async function toBilling(page: Page) {
  await signIn(page, billingOwner);
  await expect(page).toHaveURL(/\/dashboard\/owner$/);
  await page.getByRole("link", { name: "Plan, billing and featured placements" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Plan and billing" })).toBeVisible();
}

const planCard = (page: Page, name: string) => page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });
const history = (page: Page) => page.getByRole("table");

test.describe("payments", () => {
  test("the billing page is accessible @responsive", async ({ page }, info) => {
    await toBilling(page);
    // Other screen sizes run after the purchases below, so only the layout is checked here.
    await expect(page.getByRole("heading", { name: "Your plan", exact: true })).toBeVisible();
    await expectAccessible(page);
    await screenshot(page, `owner-billing-${info.project.name}`);
  });

  test("paying for a plan on Paystack switches the owner to it and its included featured week", async ({ page }) => {
    await toBilling(page);
    await expect(planCard(page, "Starter").getByText("Current")).toBeVisible();
    await expect(page.getByText("No payments yet.")).toBeVisible();
    await planCard(page, "Standard").getByRole("button", { name: "Switch to Standard" }).click();

    await expect(page).toHaveURL(new RegExp(`^${fakePaystack}/checkout/sn_[0-9a-f]{32}$`));
    // The amount comes from the plans table, not from anything the browser sent.
    await expect(page.getByText("Pay GHS 150.00 to StayNest (billing.owner@e2e.test)")).toBeVisible();
    await page.getByRole("button", { name: "Pay", exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard\/owner\/billing\?payment=settled&ref=sn_/);
    await expect(page.getByText("Payment received. Your purchase is active now.")).toBeVisible();
    await expect(page.getByText(/Standard, paid until/)).toBeVisible();
    await expect(planCard(page, "Standard").getByText("Current")).toBeVisible();
    await expect(planCard(page, "Standard").getByRole("button", { name: "Add another month" })).toBeVisible();
    await expect(history(page).getByRole("row").filter({ hasText: "Standard plan" })).toContainText("Paid");
    await expectAccessible(page);

    // The plan includes one featured week per month.
    await expect(page.getByText("You have 1 featured week left this period.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Feature for one week" }).click();
    await expect(page.getByText(/^Featured until/)).toBeVisible();
    await expect(page.getByText("You have used this period's featured weeks.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Feature for one week" })).toHaveCount(0);
    await expect(page.getByRole("listitem").filter({ hasText: "Ayeduase Billing House" }).filter({ hasText: "included in plan" })).toBeVisible();

    // The new listing limit applies straight away.
    await page.goto("/dashboard/owner");
    await expect(page.getByText("1 of 5 listings used")).toBeVisible();
  });

  test("a cancelled or underpaid checkout grants nothing", async ({ page }) => {
    await toBilling(page);
    const buy = page.getByRole("form", { name: "Buy featured weeks" });
    await buy.getByLabel("Weeks").fill("13");
    await buy.getByRole("button", { name: "Pay with Paystack" }).click();
    await expect(buy.getByText("You can buy up to 12 weeks at a time.")).toBeVisible();

    await buy.getByLabel("Weeks").fill("2");
    await expect(buy.getByText("total GHS 100", { exact: false })).toBeVisible();
    await buy.getByRole("button", { name: "Pay with Paystack" }).click();
    await expect(page.getByText("Pay GHS 100.00 to StayNest", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Cancel payment" }).click();
    await expect(page.getByText("The payment did not go through, and you were not charged.")).toBeVisible();
    await expect(history(page).getByRole("row").filter({ hasText: "2 weeks" }).first()).toContainText("Cancelled");

    await page.getByRole("form", { name: "Buy featured weeks" }).getByLabel("Weeks").fill("1");
    await page.getByRole("form", { name: "Buy featured weeks" }).getByRole("button", { name: "Pay with Paystack" }).click();
    await page.getByRole("button", { name: "Pay less than asked" }).click();
    await expect(page.getByText("The amount paid did not match the price, so nothing was applied.", { exact: false })).toBeVisible();
    await expect(history(page).getByRole("row").filter({ hasText: "1 week" }).first()).toContainText("Failed");
    // Only the included week is on the list.
    await expect(page.getByRole("listitem").filter({ hasText: "Ayeduase Billing House" })).toHaveCount(1);
  });

  test("a signed Paystack webhook settles a payment once, and a bad signature is refused", async ({ page, request }) => {
    await toBilling(page);
    const buy = page.getByRole("form", { name: "Buy featured weeks" });
    await buy.getByLabel("Weeks").fill("3");
    await buy.getByRole("button", { name: "Pay with Paystack" }).click();
    await expect(page).toHaveURL(/\/checkout\/sn_/);
    const reference = new URL(page.url()).pathname.split("/").pop()!;

    // The owner closes the tab; Paystack later reports the charge by webhook.
    expect((await request.post(`${fakePaystack}/__test/complete/${reference}`)).ok()).toBe(true);
    const body = JSON.stringify({ event: "charge.success", data: { reference, amount: 1, status: "success" } });

    const unsigned = await request.post("/api/paystack/webhook", { data: body, headers: { "content-type": "application/json" } });
    expect(unsigned.status()).toBe(401);
    const forged = await request.post("/api/paystack/webhook", {
      data: body,
      headers: { "content-type": "application/json", "x-paystack-signature": paystackSignature(body, "sk_test_wrong") },
    });
    expect(forged.status()).toBe(401);

    const signed = { "content-type": "application/json", "x-paystack-signature": paystackSignature(body) };
    const first = await request.post("/api/paystack/webhook", { data: body, headers: signed });
    expect(first.status()).toBe(200);
    // The amount in the webhook body is ignored: the server asked Paystack for the real one.
    expect(await first.json()).toEqual({ received: true, result: "settled" });
    const again = await request.post("/api/paystack/webhook", { data: body, headers: signed });
    expect(await again.json()).toEqual({ received: true, result: "already_settled" });

    const other = JSON.stringify({ event: "transfer.success", data: { reference } });
    const ignored = await request.post("/api/paystack/webhook", { data: other, headers: { ...signed, "x-paystack-signature": paystackSignature(other) } });
    expect(await ignored.json()).toEqual({ received: true });

    // Returning to the site afterwards shows it as paid, without granting it twice.
    await page.goto(`/dashboard/owner/billing/callback?trxref=${reference}&reference=${reference}`);
    await expect(page.getByText("Payment received. Your purchase is active.")).toBeVisible();
    await expect(history(page).getByRole("row").filter({ hasText: reference })).toContainText("Paid");
    await expect(page.getByRole("listitem").filter({ hasText: "Ayeduase Billing House" }).filter({ hasText: /\bpaid$/ })).toHaveCount(1);
  });

  test("admins see every payment and can ask Paystack about an unfinished one", async ({ page, request, browser }) => {
    // Leave a checkout unfinished.
    await toBilling(page);
    await planCard(page, "Premium").getByRole("button", { name: "Switch to Premium" }).click();
    await expect(page).toHaveURL(/\/checkout\/sn_/);
    const reference = new URL(page.url()).pathname.split("/").pop()!;

    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await signIn(admin, users.admin, "/admin/login");
    await expect(admin).toHaveURL(/\/admin$/);
    await admin.getByRole("link", { name: "Payments" }).click();
    await expect(admin.getByRole("heading", { level: 1, name: "Payments" })).toBeVisible();
    await expectAccessible(admin);

    await admin.getByRole("link", { name: "Failed" }).click();
    await expect(admin.getByText("Featured: Ayeduase Billing House, 1 week", { exact: false })).toBeVisible();
    await expect(admin.getByText("Paystack: Amount or currency did not match")).toBeVisible();

    await admin.getByRole("link", { name: "Not finished" }).click();
    const row = admin.getByRole("listitem").filter({ hasText: reference });
    await row.getByRole("button", { name: /^Check with Paystack/ }).click();
    await expect(admin.getByText(`${reference}: Paystack still has it as unfinished.`)).toBeVisible();
    await admin.getByRole("link", { name: "Not finished" }).click();

    expect((await request.post(`${fakePaystack}/__test/complete/${reference}`)).ok()).toBe(true);
    await row.getByRole("button", { name: /^Check with Paystack/ }).click();
    await expect(admin.getByText(`${reference}: Paystack confirmed it. The purchase is now active.`)).toBeVisible();
    await expect(admin.getByRole("listitem").filter({ hasText: reference })).toContainText("Paid");
    await adminContext.close();

    await page.goto("/dashboard/owner/billing");
    await expect(page.getByText(/Premium, paid until/)).toBeVisible();
  });
});

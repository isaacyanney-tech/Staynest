import { expect, test } from "@playwright/test";
import { PASSWORD, signIn, users } from "./support/helpers";
import { fakePaystack, paystackSignature } from "./support/paystack";

// Limits, duplicate protection and behaviour under simultaneous use.
test.describe.configure({ mode: "serial" });

const checkoutOwner = "checkout.owner@e2e.test";

test.describe("hardening", () => {
  test("repeated wrong passwords for one account are slowed down", async ({ page }) => {
    const email = "locked.out@e2e.test";
    const password = page.getByLabel("Password", { exact: true });
    await page.goto("/sign-in");
    for (let i = 0; i < 10; i++) {
      await page.getByLabel("Email").fill(email);
      await password.fill(`wrong-${i}`);
      await page.getByRole("button", { name: "Sign in" }).click();
      // The form clears the password once the answer arrives.
      await expect(password).toHaveValue("");
      await expect(page.getByText("That email and password do not match an account.")).toBeVisible();
    }
    await password.fill("wrong-again");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Too many attempts. Wait a few minutes and try again.")).toBeVisible();

    // Other accounts are not affected.
    await page.getByLabel("Email").fill(users.student);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard\/student$/);
  });

  test("paying from two tabs at once opens one checkout, not two", async ({ page, context, request }) => {
    await signIn(page, checkoutOwner);
    await expect(page).toHaveURL(/\/dashboard\/owner$/);
    const second = await context.newPage();
    for (const p of [page, second]) await p.goto("/dashboard/owner/billing");
    const pay = (p: typeof page) =>
      p
        .getByRole("listitem")
        .filter({ has: p.getByRole("heading", { name: "Standard", exact: true }) })
        .getByRole("button", { name: "Switch to Standard" });
    await Promise.all([pay(page).click(), pay(second).click()]);
    await expect(page).toHaveURL(/\/checkout\/sn_[0-9a-f]{32}$/);
    await expect(second).toHaveURL(/\/checkout\/sn_[0-9a-f]{32}$/);
    expect(second.url()).toBe(page.url());

    // Coming back and clicking again returns to the same checkout.
    await second.goto("/dashboard/owner/billing");
    await pay(second).click();
    await expect(second).toHaveURL(page.url());

    const transactions: { reference: string; email: string }[] = await (
      await request.get(`${fakePaystack}/__test/transactions`)
    ).json();
    expect(transactions.filter((t) => t.email === checkoutOwner)).toHaveLength(1);
  });

  test("a payment reported many times at once is applied once", async ({ page, request }) => {
    await signIn(page, checkoutOwner);
    await expect(page).toHaveURL(/\/dashboard\/owner$/);
    await page.goto("/dashboard/owner/billing");
    await page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Standard", exact: true }) })
      .getByRole("button", { name: "Switch to Standard" })
      .click();
    await expect(page).toHaveURL(/\/checkout\/sn_/);
    const reference = new URL(page.url()).pathname.split("/").pop()!;
    expect((await request.post(`${fakePaystack}/__test/complete/${reference}`)).ok()).toBe(true);

    const body = JSON.stringify({ event: "charge.success", data: { reference } });
    const headers = { "content-type": "application/json", "x-paystack-signature": paystackSignature(body) };
    const results = await Promise.all(
      Array.from({ length: 8 }, async () => (await request.post("/api/paystack/webhook", { data: body, headers })).json()),
    );
    expect(results.filter((r) => r.result === "settled")).toHaveLength(1);
    expect(results.filter((r) => r.result === "already_settled")).toHaveLength(7);

    await page.goto("/dashboard/owner/billing");
    await expect(page.getByRole("table").getByRole("row").filter({ hasText: reference })).toContainText("Paid");
    await expect(page.getByRole("table").getByRole("row").filter({ hasText: "Standard plan" })).toHaveCount(1);
  });

  test("public pages keep answering when many visitors arrive together", async ({ request }) => {
    const paths = ["/", "/hostels", "/hostels/okponglo-test-house", "/universities", "/pricing"];
    const started = Date.now();
    const responses = await Promise.all(Array.from({ length: 60 }, (_, i) => request.get(paths[i % paths.length])));
    expect(responses.map((r) => r.status()).filter((s) => s !== 200)).toEqual([]);
    // Generous bound: a cold local build on a shared machine, not a benchmark.
    expect(Date.now() - started).toBeLessThan(30_000);
  });
});

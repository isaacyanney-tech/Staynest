import { createHmac } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";
import { fakePaystack, paystackTestSecret } from "./e2e/support/paystack";

// Browser tests run against a production build. By default they start a local
// backend (PostgreSQL + PostgREST + the fake Supabase API in e2e/support), so
// they need psql and the PostgREST binary at .tools/postgrest. Set
// E2E_BASE_URL to test an already running deployment instead.
const external = process.env.E2E_BASE_URL;
const port = 3100;
const baseURL = external ?? `http://127.0.0.1:${port}`;
const fakeSupabase = "http://127.0.0.1:54321";

// A service-role token for the local PostgREST, signed with the e2e-only secret.
function serviceRoleToken() {
  const part = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const head = part({ alg: "HS256", typ: "JWT" });
  const body = part({ role: "service_role", iss: "e2e", iat: 1_700_000_000, exp: 4_100_000_000 });
  const sig = createHmac("sha256", "e2e-only-secret-not-used-anywhere-else-000").update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // In CI the "github" reporter turns failures into annotations on the check run,
  // so the reason is readable without downloading the report.
  reporter: [process.env.CI ? ["github"] : ["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  globalSetup: external ? undefined : "./e2e/support/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } }, grep: /@responsive/ },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } }, grep: /@responsive/ },
  ],
  webServer: external
    ? undefined
    : [
        {
          command: "./.tools/postgrest e2e/support/postgrest.conf",
          url: "http://127.0.0.1:54322/",
          reuseExistingServer: true,
          env: {
            // Defaults to the local socket used in development; CI sets its own.
            PGRST_DB_URI: process.env.PGRST_DB_URI ?? "postgres://postgres@/staynest_e2e?host=/tmp/pg&port=54329",
          },
        },
        {
          command: "node e2e/support/fake-supabase.mjs",
          url: `${fakeSupabase}/rest/v1/`,
          reuseExistingServer: true,
        },
        {
          command: "node e2e/support/fake-paystack.mjs",
          url: `${fakePaystack}/__test/transactions`,
          reuseExistingServer: true,
          env: { FAKE_PAYSTACK_SECRET: paystackTestSecret },
        },
        {
          command: `npx next build && npx next start -p ${port} -H 127.0.0.1`,
          url: baseURL,
          timeout: 300_000,
          reuseExistingServer: !process.env.CI,
          env: {
            NEXT_PUBLIC_SUPABASE_URL: fakeSupabase,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
            NEXT_PUBLIC_SITE_URL: baseURL,
            PAYSTACK_API_URL: fakePaystack,
            PAYSTACK_SECRET_KEY: paystackTestSecret,
            SUPABASE_SERVICE_ROLE_KEY: serviceRoleToken(),
          },
        },
      ],
});

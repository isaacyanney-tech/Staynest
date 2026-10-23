import { defineConfig, devices } from "@playwright/test";

// Browser tests run against a production build. By default they start a local
// backend (PostgreSQL + PostgREST + the fake Supabase API in e2e/support), so
// they need psql and the PostgREST binary at .tools/postgrest. Set
// E2E_BASE_URL to test an already running deployment instead.
const external = process.env.E2E_BASE_URL;
const port = 3100;
const baseURL = external ?? `http://127.0.0.1:${port}`;
const fakeSupabase = "http://127.0.0.1:54321";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
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
          command: `npx next build && npx next start -p ${port} -H 127.0.0.1`,
          url: baseURL,
          timeout: 300_000,
          reuseExistingServer: !process.env.CI,
          env: {
            NEXT_PUBLIC_SUPABASE_URL: fakeSupabase,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
            NEXT_PUBLIC_SITE_URL: baseURL,
          },
        },
      ],
});

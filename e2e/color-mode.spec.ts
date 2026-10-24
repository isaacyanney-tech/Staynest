import { expect, test } from "@playwright/test";
import { expectAccessible, screenshot } from "./support/helpers";

const theme = (page: import("@playwright/test").Page) => page.evaluate(() => document.documentElement.dataset.theme);

test.describe("light and dark mode", () => {
  test("follows the device setting until the visitor picks one", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    expect(await theme(page)).toBe("dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => theme(page)).toBe("light");
  });

  test("the switch changes the mode and remembers it", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/hostels");
    const toggle = page.getByRole("banner").getByRole("button", { name: "Dark mode" }).first();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(await theme(page)).toBe("dark");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(11, 20, 28)");

    // A saved choice wins over the device setting, on every page.
    await page.goto("/sign-in");
    expect(await theme(page)).toBe("dark");
    await page.emulateMedia({ colorScheme: "light" });
    await page.reload();
    expect(await theme(page)).toBe("dark");
  });

  for (const path of ["/", "/hostels", "/hostels/okponglo-test-house", "/sign-in", "/pricing"]) {
    test(`${path} meets contrast rules in dark mode @responsive`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto(path);
      expect(await theme(page)).toBe("dark");
      await expectAccessible(page);
      if (path === "/") await screenshot(page, `home-dark-${info.project.name}`);
    });
  }

  test("homepage hero draws the wave background, and reduced motion keeps headings still", async ({ page }) => {
    await page.goto("/");
    // Browsers that would draw WebGL in software (like headless CI machines)
    // get the plain gradient; everyone else gets the canvas.
    const hardwareGl = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true });
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      const name = gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
      return gl !== null && !/swiftshader|llvmpipe|softpipe|software|basic render driver/i.test(name);
    });
    // Wait for the lazily loaded waves component before counting.
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".hero-waves canvas")).toHaveCount(hardwareGl ? 1 : 0);
    await expect(page.locator(".hero-band").first()).toHaveCSS("background-image", /gradient/);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    const heading = page.locator("main h2").first();
    await heading.scrollIntoViewIfNeeded();
    const opacities = await heading.locator(".scroll-reveal-piece").evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
    expect(opacities.length).toBeGreaterThan(0);
    for (const o of opacities) expect(o).toBe("1");
  });

  test("site has a favicon and touch icon", async ({ request }) => {
    for (const path of ["/favicon.ico", "/icon.svg", "/apple-icon.png"]) {
      const res = await request.get(path);
      expect(res.ok(), path).toBe(true);
    }
  });
});

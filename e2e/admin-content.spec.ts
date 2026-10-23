import sharp from "sharp";
import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, screenshot, signIn, users } from "./support/helpers";

async function asAdmin(page: Page) {
  await signIn(page, users.admin, "/admin/login");
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe("content editor", () => {
  test("the editor works on every screen size @responsive", async ({ page }, info) => {
    await asAdmin(page);
    await page.goto("/admin/content/home/hero");
    await expect(page.getByLabel("Heading", { exact: true })).toBeVisible();
    await expectAccessible(page);
    await screenshot(page, `admin-section-editor-${info.project.name}`);
  });

  test("a hero edit stays a draft until published, and an earlier version can be restored", async ({ page }) => {
    await asAdmin(page);
    await page.goto("/admin/content");
    await page.getByRole("link", { name: "Homepage" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Homepage" })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole("link", { name: "Hero", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content\/home\/hero$/);

    const heading = page.getByLabel("Heading", { exact: true });
    const original = await heading.inputValue();
    await heading.fill("");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("One field needs fixing before this can be saved.")).toBeVisible();
    await expect(page.getByText("Fill this in.")).toBeVisible();
    // The editor keeps what was typed after an error.
    await expect(heading).toHaveValue("");

    await heading.fill("Hostels near campus, checked by people");
    await expect(page.getByText("You have unsaved edits.")).toBeVisible();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved. Preview it, then publish when ready.")).toBeVisible();
    await expect(page.getByText("All edits saved.")).toBeVisible();
    await expectAccessible(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: original })).toBeVisible();
    await page.goto("/admin/preview/home");
    await expect(page.getByText("Saved drafts are shown")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Hostels near campus, checked by people" })).toBeVisible();

    await page.goto("/admin/content/home/hero");
    await page.getByRole("button", { name: "Save and publish" }).click();
    await expect(page.getByText("Published. The change is live on the site.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Hostels near campus, checked by people" })).toBeVisible();

    // Publish a second version, then bring back the first from the history.
    await page.goto("/admin/content/home/hero");
    await page.getByLabel("Heading", { exact: true }).fill("A second published heading");
    await page.getByRole("button", { name: "Save and publish" }).click();
    await expect(page.getByText("Published. The change is live on the site.")).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: /^Restore the version from/ }).nth(1).click();
    await expect(page.getByText("Earlier version restored to the draft.")).toBeVisible();
    await expect(page.getByLabel("Heading", { exact: true })).toHaveValue("Hostels near campus, checked by people");
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "A second published heading" })).toBeVisible();

    // Put the seeded heading back for the other tests.
    await page.goto("/admin/content/home/hero");
    await page.getByLabel("Heading", { exact: true }).fill(original);
    await page.getByRole("button", { name: "Save and publish" }).click();
    await expect(page.getByText("Published. The change is live on the site.")).toBeVisible();
  });

  test("FAQ questions can be added and reordered", async ({ page }) => {
    await asAdmin(page);
    await page.goto("/admin/content/faq/questions");
    await expect(page.getByRole("group", { name: "Question 1", exact: true })).toBeVisible();
    const before = await page.getByRole("group", { name: /^Question \d+$/ }).count();
    expect(before).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Add question" }).click();
    const added = page.getByRole("group", { name: `Question ${before + 1}`, exact: true });
    await added.getByLabel("Question", { exact: true }).fill("Can I pay rent in two parts?");
    await added.getByLabel(/Answer/).fill("Many owners accept two instalments. Ask during your inspection.");
    await added.getByRole("button", { name: `Move question ${before + 1} up` }).click();
    await expect(page.getByRole("group", { name: `Question ${before}`, exact: true }).getByLabel("Question", { exact: true })).toHaveValue("Can I pay rent in two parts?");
    await page.getByRole("button", { name: "Save and publish" }).click();
    await expect(page.getByText("Published. The change is live on the site.")).toBeVisible();

    await page.goto("/faq");
    await expect(page.getByText("Can I pay rent in two parts?")).toBeVisible();
  });

  test("sections can be hidden and shown", async ({ page }) => {
    await asAdmin(page);
    await page.goto("/admin/content/home");
    await page.getByRole("button", { name: "Hide How it works" }).click();
    await expect(page.getByRole("button", { name: "Show How it works" })).toBeVisible();
    await page.goto("/");
    await expect(page.locator("#how-it-works")).toHaveCount(0);
    await page.goto("/admin/content/home");
    await page.getByRole("button", { name: "Show How it works" }).click();
    await expect(page.getByRole("button", { name: "Hide How it works" })).toBeVisible();
    await page.goto("/");
    await expect(page.locator("#how-it-works")).toHaveCount(1);
  });
});

test.describe("media library and site settings", () => {
  test("an uploaded image needs a licence confirmation and cannot be deleted while in use", async ({ page }) => {
    await asAdmin(page);
    await page.goto("/admin/media");
    await expectAccessible(page);
    const file = {
      name: "campus.png",
      mimeType: "image/png",
      buffer: await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 24, g: 169, b: 153 } } }).png().toBuffer(),
    };
    await page.getByLabel("Image", { exact: true }).setInputFiles(file);
    await page.getByLabel("Describe the image").fill("Students walking to lectures at dusk");
    await page.getByRole("checkbox", { name: /Illustrative/ }).check();
    await page.getByRole("button", { name: "Upload image" }).click();
    await expect(page.getByText("Confirm you may use this image.")).toBeVisible();

    await page.getByLabel("Image", { exact: true }).setInputFiles(file);
    await page.getByRole("checkbox", { name: /its licence allows/ }).check();
    await page.getByRole("button", { name: "Upload image" }).click();
    await expect(page.getByText("Uploaded. You can now choose it in the content editor.")).toBeVisible();
    const card = page.getByRole("listitem").filter({ hasText: "Students walking to lectures at dusk" });
    await expect(card.getByText("Illustrative", { exact: true })).toBeVisible();
    await expect(card.getByRole("img", { name: "Students walking to lectures at dusk" })).toBeVisible();

    await page.goto("/admin/content/home/hero");
    await page.getByLabel("Image").selectOption({ label: "Students walking to lectures at dusk (illustrative)" });
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved.", { exact: false })).toBeVisible();

    await page.goto("/admin/media");
    await card.getByText("Edit details").click();
    await card.getByRole("button", { name: "Delete image" }).click();
    await expect(card.getByText(/still used in: Hero \(draft\)/)).toBeVisible();

    // Clear the draft image so other tests see the seeded hero.
    await page.goto("/admin/content/home/hero");
    await page.getByLabel("Image").selectOption({ label: "No image" });
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved.", { exact: false })).toBeVisible();
  });

  test("site colours, menu links, contact details and banners go live when saved", async ({ page }, info) => {
    await asAdmin(page);
    await page.goto("/admin/site");
    await expectAccessible(page);
    await screenshot(page, `admin-site-${info.project.name}`);

    const colours = page.getByRole("region", { name: "Colours" });
    await colours.getByRole("radio", { name: "Forest teal" }).check();
    await colours.getByRole("button", { name: "Save colours" }).click();
    await expect(colours.getByText("Saved. The change is live on every page.")).toBeVisible();

    const contact = page.getByRole("region", { name: "Contact details" });
    await contact.getByLabel("Email").fill("not an email");
    await contact.getByRole("button", { name: "Save contact details" }).click();
    await expect(contact.getByText("Enter a valid email address.")).toBeVisible();
    await contact.getByLabel("Email").fill("help@staynest.example");
    await contact.getByLabel("Opening hours").fill("Every day, 8:00 to 20:00");
    await contact.getByRole("button", { name: "Save contact details" }).click();
    await expect(contact.getByText("Saved. The change is live on every page.")).toBeVisible();

    const addHeader = page.getByRole("form", { name: "Add a header link" });
    await addHeader.getByLabel("Link text").fill("Safety");
    await addHeader.getByLabel("Goes to").fill("javascript:alert(1)");
    await addHeader.getByRole("button", { name: "Add link" }).click();
    await expect(addHeader.getByText("Use a path starting with / or a full https:// link.")).toBeVisible();
    await addHeader.getByLabel("Goes to").fill("/safety");
    await addHeader.getByRole("button", { name: "Add link" }).click();
    await expect(page.getByRole("form", { name: "Edit link Safety", exact: true })).toBeVisible();

    const banner = page.getByRole("form", { name: "New banner" });
    await banner.getByLabel("Message").fill("Inspections for the new academic year are open.");
    await banner.getByLabel("Link text").fill("Find a hostel");
    await banner.getByLabel("Link goes to").fill("/hostels");
    await banner.getByRole("checkbox", { name: "Switched on" }).check();
    await banner.getByRole("button", { name: "Add banner" }).click();
    await expect(page.getByText("Showing now")).toBeVisible();

    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("style", /--brand-primary:\s*#0B4F4A/i);
    await expect(page.getByText("Inspections for the new academic year are open.")).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Safety" })).toBeVisible();
    await expectAccessible(page);
    await page.goto("/contact");
    await expect(page.getByText("Every day, 8:00 to 20:00")).toBeVisible();

    // Restore the defaults so the public page tests see the seeded site.
    await page.goto("/admin/site");
    await page.getByRole("region", { name: "Colours" }).getByRole("radio", { name: /Harbour navy/ }).check();
    await page.getByRole("region", { name: "Colours" }).getByRole("button", { name: "Save colours" }).click();
    await expect(page.getByRole("region", { name: "Colours" }).getByText("Saved.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Delete Safety", exact: true }).click();
    await expect(page.getByRole("form", { name: "Edit link Safety", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Delete banner" }).click();
    await expect(page.getByText("Showing now")).toHaveCount(0);
  });
});

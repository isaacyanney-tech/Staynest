import sharp from "sharp";
import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, screenshot, signIn } from "./support/helpers";

const newOwner = "new.owner@e2e.test";
const publishedId = "e2e10000-0000-4000-8000-000000000001";

const photo = async (name: string, colour: { r: number; g: number; b: number }) => ({
  name,
  mimeType: "image/jpeg",
  buffer: await sharp({ create: { width: 1200, height: 900, channels: 3, background: colour } }).jpeg().toBuffer(),
});

async function asOwner(page: Page, email = "owner@e2e.test") {
  await signIn(page, email);
  await expect(page).toHaveURL(/\/dashboard\/owner$/);
}

test.describe("owner listing editor", () => {
  test("dashboard and editor are accessible @responsive", async ({ page }, info) => {
    await asOwner(page);
    await expect(page.getByRole("heading", { name: "Your hostels" })).toBeVisible();
    await expect(page.getByText("1 of 1 listing used")).toBeVisible();
    // The Starter plan allows one listing, so the owner is pointed to plans.
    await expect(page.getByRole("link", { name: "Upgrade to add more" })).toBeVisible();
    await expectAccessible(page);
    await screenshot(page, `owner-dashboard-${info.project.name}`);

    await page.getByRole("link", { name: "Okponglo Test House" }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/owner/hostels/${publishedId}$`));
    await expect(page.getByText("This listing is live.")).toBeVisible();
    await expect(page.getByRole("link", { name: "View public page" })).toHaveAttribute("href", "/hostels/okponglo-test-house");
    await expectAccessible(page);
    await screenshot(page, `owner-editor-${info.project.name}`);
  });

  test("owner answers an inspection request", async ({ page }) => {
    await asOwner(page);
    const request = page.locator("li").filter({ hasText: "Kwame Adjei" });
    await expect(request.getByText("Needs your reply")).toBeVisible();
    await expect(request.getByRole("link", { name: "+233 24 555 0101" })).toHaveAttribute("href", "tel:+233245550101");

    await request.getByRole("radio", { name: "Decline" }).check();
    await request.getByRole("button", { name: "Send reply" }).click();
    await expect(request.getByText("Tell the student why, so they can look elsewhere.")).toBeVisible();
    await expect(request.getByRole("radio", { name: "Decline" })).toBeChecked();

    await request.getByRole("radio", { name: "Accept this date" }).check();
    await request.getByLabel(/Message to the student/).fill("Meet me at the gate at 10.");
    await request.getByRole("button", { name: "Send reply" }).click();
    await expect(page.locator("li").filter({ hasText: "Kwame Adjei" }).getByText("Accepted", { exact: true })).toBeVisible();
    await expectAccessible(page);
  });

  test("a live listing's edits appear on the public page straight away", async ({ page }) => {
    await asOwner(page);
    await page.goto(`/dashboard/owner/hostels/${publishedId}`);
    await page.getByLabel("Short summary").fill("Updated by the owner in a browser test.");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Saved. Changes are live on your listing.")).toBeVisible();
    await page.goto("/hostels/okponglo-test-house");
    await expect(page.getByText("Updated by the owner in a browser test.")).toBeVisible();
  });

  test("new owner creates a listing, adds rooms and photos, submits it and requests verification", async ({ page }) => {
    await asOwner(page, newOwner);
    await expect(page.getByRole("heading", { name: "List your first hostel" })).toBeVisible();
    await page.getByRole("link", { name: "Add a hostel" }).first().click();
    await expect(page.getByLabel("Hostel name")).toBeVisible();
    await expectAccessible(page);

    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page.getByText("Enter the hostel's name.")).toBeVisible();
    await expect(page.getByText("Enter the area or neighbourhood.")).toBeVisible();

    await page.getByLabel("Hostel name").fill("Ayeduase Garden Hostel");
    await page.getByLabel("Area or neighbourhood").fill("Ayeduase");
    await page.getByLabel("Town or city").fill("Kumasi");
    await page.getByRole("checkbox", { name: "Wi-Fi" }).check();
    await page.getByRole("checkbox", { name: "Backup power" }).check();
    await page.getByLabel("Phone for students").fill("call me");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page.getByText("Enter a phone number like +233 20 123 4567.")).toBeVisible();
    // Values survive a failed save, including ticked amenities.
    await expect(page.getByLabel("Hostel name")).toHaveValue("Ayeduase Garden Hostel");
    await expect(page.getByRole("checkbox", { name: "Backup power" })).toBeChecked();

    await page.getByLabel("Phone for students").fill("+233 20 555 0199");
    await page.getByLabel("Distance to campus (km)").fill("1.5");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/dashboard\/owner\/hostels\/[0-9a-f-]{36}\?created=1$/);
    await expect(page.getByText("Draft created")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit for review" })).toBeDisabled();

    // Rooms
    const addRoom = page.locator("form").filter({ has: page.getByRole("button", { name: "Add room" }) });
    await addRoom.getByLabel("Room type").fill("Two in a room");
    await addRoom.getByLabel("Price per person (GHS)").fill("4800");
    await addRoom.getByLabel("Rooms of this type").fill("6");
    await addRoom.getByLabel("Available now").fill("8");
    await addRoom.getByRole("button", { name: "Add room" }).click();
    await expect(page.getByText("Available rooms cannot exceed the total.")).toBeVisible();
    await addRoom.getByLabel("Available now").fill("3");
    await addRoom.getByRole("button", { name: "Add room" }).click();
    await expect(page.getByText("Room added.")).toBeVisible();
    await expect(page.getByText("3 of 6 available")).toBeVisible();
    await expect(page.getByText("GHS 4,800")).toBeVisible();

    // Changing the billing period sticks, and saving the room again keeps it.
    await page.getByText("Edit Two in a room").click();
    const editRoom = page.locator("form").filter({ has: page.getByRole("button", { name: "Save room" }) });
    await editRoom.getByLabel("Charged").selectOption("semester");
    await editRoom.getByRole("button", { name: "Save room" }).click();
    await expect(page.getByText("Room updated.")).toBeVisible();
    await expect(editRoom.getByLabel("Charged")).toHaveValue("semester");
    await editRoom.getByLabel("Price per person (GHS)").fill("2500");
    await editRoom.getByRole("button", { name: "Save room" }).click();
    await expect(page.getByText("GHS 2,500")).toBeVisible();
    await expect(editRoom.getByLabel("Charged")).toHaveValue("semester");

    // Photos: a file that only claims to be a JPEG is refused.
    const upload = page.locator("form").filter({ has: page.getByRole("button", { name: "Upload photo" }) });
    await upload.getByLabel("Photo", { exact: true }).setInputFiles({ name: "room.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<html>not a photo</html>") });
    await upload.getByLabel("Describe the photo").fill("Two-bed room");
    await upload.getByRole("button", { name: "Upload photo" }).click();
    await expect(upload.getByText("Upload a JPEG, PNG, WebP or AVIF photo.").first()).toBeVisible();

    await upload.getByLabel("Photo", { exact: true }).setInputFiles(await photo("front.jpg", { r: 24, g: 59, b: 87 }));
    await upload.getByLabel("Describe the photo").fill("Front gate and courtyard");
    await upload.getByRole("button", { name: "Upload photo" }).click();
    await expect(page.getByText("Photo added.")).toBeVisible();
    await upload.getByLabel("Photo", { exact: true }).setInputFiles(await photo("room.jpg", { r: 24, g: 169, b: 153 }));
    await upload.getByLabel("Describe the photo").fill("Two-bed room with desks");
    await upload.getByRole("button", { name: "Upload photo" }).click();
    await expect(page.getByRole("heading", { name: "Photos" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Two-bed room with desks" })).toBeVisible();

    // The uploaded file is served from storage and the cover can be changed.
    const photos = page.locator("#photos ol > li");
    await expect(photos).toHaveCount(2);
    await expect(photos.first().getByRole("img")).toHaveAttribute("alt", "Front gate and courtyard");
    await expect.poll(() => photos.first().getByRole("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await photos.nth(1).getByRole("button", { name: "Make cover" }).click();
    await expect(photos.first().getByRole("img")).toHaveAttribute("alt", "Two-bed room with desks");
    await expect(photos.first().getByText("Cover")).toBeVisible();

    await photos.first().getByText("Edit description of photo 1").click();
    await photos.first().getByLabel("Caption").fill("Every room has two desks");
    await photos.first().getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Photo details saved.")).toBeVisible();

    await page.getByLabel("Short summary").fill("Quiet hostel ten minutes' walk from KNUST.");
    await page.locator("#details").getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
    await expectAccessible(page);

    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByText("Waiting for review")).toBeVisible();
    await expect(page.getByText("In review", { exact: true })).toBeVisible();

    // Verification: identity is required alongside ownership.
    const verify = page.locator("#verification");
    await verify.getByLabel("Proof of ownership or management").setInputFiles({ name: "lease.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
    await verify.getByRole("button", { name: "Request verification" }).click();
    await expect(verify.getByText("Add a photo ID, such as a Ghana Card.")).toBeVisible();
    await verify.getByLabel("Proof of ownership or management").setInputFiles({ name: "lease.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
    await verify.getByLabel("Photo ID").setInputFiles(await photo("ghana-card.jpg", { r: 200, g: 200, b: 200 }));
    await verify.getByLabel(/Note for the reviewer/).fill("I manage the property for my family.");
    await verify.getByRole("button", { name: "Request verification" }).click();
    // The section switches to the review state once the documents are stored.
    await expect(verify.getByText(/Documents received/)).toBeVisible();
    await expect(verify.getByText("lease.pdf")).toBeVisible();
    await expect(verify.getByText("ghana-card.jpg")).toBeVisible();
    await screenshot(page, "owner-new-listing-desktop");

    // Back on the dashboard the listing counts towards the plan.
    await page.goto("/dashboard/owner");
    const row = page.locator("li").filter({ hasText: "Ayeduase Garden Hostel" });
    await expect(row.getByText("In review")).toBeVisible();
    await expect(row.getByText("2 photos")).toBeVisible();
  });

  test("withdrawing and deleting a draft removes its stored photos", async ({ page, request }) => {
    await asOwner(page, newOwner);
    await page.getByRole("link", { name: "Ayeduase Garden Hostel" }).click();
    const src = await page.locator("#photos ol > li").first().getByRole("img").getAttribute("src");
    const fileUrl = new URL(src!, page.url()).searchParams.get("url") ?? src!;
    expect((await request.get(fileUrl)).status()).toBe(200);

    await page.getByRole("button", { name: "Withdraw from review" }).click();
    await expect(page.getByRole("button", { name: "Submit for review" })).toBeEnabled();
    await page.getByText("Delete this listing").click();
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page).toHaveURL(/\/dashboard\/owner\?deleted=1$/);
    await expect(page.getByText("The draft and its photos were deleted.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "List your first hostel" })).toBeVisible();
    expect((await request.get(fileUrl)).status()).not.toBe(200);
  });

  test("owners cannot open other owners' listings, and students cannot open the editor", async ({ page }) => {
    await asOwner(page, newOwner);
    await page.goto(`/dashboard/owner/hostels/${publishedId}`);
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
    await expect(page.getByRole("heading", { name: "Okponglo Test House" })).toHaveCount(0);
    await expect(page.getByLabel("Hostel name")).toHaveCount(0);

    await page.context().clearCookies();
    await signIn(page, "student@e2e.test");
    await expect(page).toHaveURL(/\/dashboard\/student$/);
    await page.goto(`/dashboard/owner/hostels/${publishedId}`);
    await expect(page).toHaveURL(/\/dashboard\/student$/);
  });
});

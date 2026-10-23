// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepareDocument, preparePhoto, sniff, UploadError } from "./uploads";

const image = (width: number, height: number, format: "jpeg" | "png" | "webp" = "jpeg") =>
  sharp({ create: { width, height, channels: 3, background: { r: 24, g: 169, b: 153 } } })
    .withMetadata({ exif: { IFD0: { Copyright: "secret-gps-marker" } } })
    [format]()
    .toBuffer();
const file = (data: Uint8Array | Buffer, name = "photo.jpg", type = "image/jpeg") => new File([new Uint8Array(data)], name, { type });

describe("sniff", () => {
  it("recognises files by their contents", async () => {
    expect(sniff(await image(10, 10, "jpeg"))).toBe("jpeg");
    expect(sniff(await image(10, 10, "png"))).toBe("png");
    expect(sniff(await image(10, 10, "webp"))).toBe("webp");
    expect(sniff(new TextEncoder().encode("%PDF-1.7\n"))).toBe("pdf");
  });
  it("ignores what the name or browser claims", () => {
    expect(sniff(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniff(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(sniff(new Uint8Array())).toBeNull();
  });
});

describe("preparePhoto", () => {
  it("re-encodes to WebP, shrinks large photos and strips metadata", async () => {
    const out = await preparePhoto(file(await image(3000, 1500)));
    expect(sniff(out.data)).toBe("webp");
    expect(out.width).toBe(2000);
    expect(out.height).toBe(1000);
    const meta = await sharp(out.data).metadata();
    expect(meta.exif).toBeUndefined();
    expect(out.data.includes(Buffer.from("secret-gps-marker"))).toBe(false);
  });
  it("keeps small-enough photos at their size", async () => {
    const out = await preparePhoto(file(await image(800, 600, "png"), "room.png", "image/png"));
    expect([out.width, out.height]).toEqual([800, 600]);
  });
  it("rejects tiny photos, non-images and empty files", async () => {
    await expect(preparePhoto(file(await image(200, 150)))).rejects.toThrow(/at least 400 by 300/);
    await expect(preparePhoto(file(new TextEncoder().encode("<html>"), "x.jpg"))).rejects.toThrow(UploadError);
    await expect(preparePhoto(file(new Uint8Array()))).rejects.toThrow(/Choose a photo/);
  });
  it("rejects files over 8 MB before reading them", async () => {
    const big = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "big.jpg");
    await expect(preparePhoto(big)).rejects.toThrow(/8 MB/);
  });
  it("rejects corrupt images that only look like JPEGs", async () => {
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(200, 7)]);
    await expect(preparePhoto(file(broken))).rejects.toThrow(/could not be read/);
  });
});

describe("prepareDocument", () => {
  it("keeps PDFs as sent", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");
    const out = await prepareDocument(file(pdf, "deed.pdf", "application/pdf"));
    expect(out.ext).toBe("pdf");
    expect(out.contentType).toBe("application/pdf");
    expect(Buffer.compare(out.data, Buffer.from(pdf))).toBe(0);
  });
  it("re-encodes images as WebP", async () => {
    const out = await prepareDocument(file(await image(500, 400)));
    expect(out.ext).toBe("webp");
    expect(sniff(out.data)).toBe("webp");
  });
  it("rejects other file types even with a PDF name", async () => {
    await expect(prepareDocument(file(new TextEncoder().encode("MZ executable"), "deed.pdf", "application/pdf"))).rejects.toThrow(/PDF, JPEG/);
  });
});

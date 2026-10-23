import "server-only";
import sharp from "sharp";

// Uploaded files are identified by their contents, never by the name or the
// type the browser claims. Images are decoded and re-encoded, which strips
// metadata (including GPS location) and anything appended to the file.

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export type Sniffed = "jpeg" | "png" | "webp" | "avif" | "pdf" | null;

export function sniff(bytes: Uint8Array): Sniffed {
  const at = (i: number, ...v: number[]) => v.every((b, j) => bytes[i + j] === b);
  const ascii = (i: number, s: string) => at(i, ...[...s].map((c) => c.charCodeAt(0)));
  if (at(0, 0xff, 0xd8, 0xff)) return "jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
  if (ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis"))) return "avif";
  if (ascii(0, "%PDF-")) return "pdf";
  return null;
}

export class UploadError extends Error {}

/** Checks a photo upload and returns a re-encoded WebP no larger than 2000px. */
export async function preparePhoto(file: File): Promise<{ data: Buffer; width: number; height: number }> {
  if (!file || file.size === 0) throw new UploadError("Choose a photo to upload.");
  if (file.size > MAX_PHOTO_BYTES) throw new UploadError("Photos must be 8 MB or smaller.");
  const input = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(input);
  if (kind !== "jpeg" && kind !== "png" && kind !== "webp" && kind !== "avif") {
    throw new UploadError("Upload a JPEG, PNG, WebP or AVIF photo.");
  }
  try {
    const { data, info } = await sharp(input, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    if (info.width < 400 || info.height < 300) {
      throw new UploadError("Photos must be at least 400 by 300 pixels.");
    }
    return { data, width: info.width, height: info.height };
  } catch (e) {
    if (e instanceof UploadError) throw e;
    throw new UploadError("That photo could not be read. Try exporting it again as a JPEG.");
  }
}

/** Checks a verification document. PDFs are kept as sent; images are re-encoded. */
export async function prepareDocument(file: File): Promise<{ data: Buffer; ext: "pdf" | "webp"; contentType: string }> {
  if (!file || file.size === 0) throw new UploadError("Choose a document to upload.");
  if (file.size > MAX_DOCUMENT_BYTES) throw new UploadError("Documents must be 10 MB or smaller.");
  const input = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(input);
  if (kind === "pdf") return { data: Buffer.from(input), ext: "pdf", contentType: "application/pdf" };
  if (kind === "jpeg" || kind === "png" || kind === "webp") {
    try {
      const data = await sharp(input, { limitInputPixels: 60_000_000, failOn: "error" })
        .rotate()
        .resize({ width: 3000, height: 3000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer();
      return { data, ext: "webp", contentType: "image/webp" };
    } catch {
      throw new UploadError("That image could not be read. Try a PDF instead.");
    }
  }
  throw new UploadError("Upload a PDF, JPEG, PNG or WebP file.");
}

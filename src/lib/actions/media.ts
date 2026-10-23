"use server";
import { randomUUID } from "node:crypto";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { authorize, AuthorizationError, type Viewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CMS_TAG } from "@/lib/cms/queries";
import { mediaDetailsFromForm } from "@/lib/admin/schemas";
import { preparePhoto, UploadError } from "@/lib/uploads";
import { formValues, fromZodError, friendlyDbError, type FormState } from "@/lib/forms";

// The site's own images (hero, logo and so on). Files go to public-media under
// site/, which only administrators may write. Every upload is re-encoded, so
// metadata such as location is stripped and only real images are stored.

const denied: FormState = { status: "error", message: "Sign in with an administrator account to do that." };

async function admin(): Promise<Viewer | null> {
  try {
    return await authorize(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }
}

export async function uploadMedia(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await admin();
  if (!viewer) return denied;
  const details = mediaDetailsFromForm(formData);
  if (!details.success) return fromZodError(details.error, formData);
  if (formData.get("rights") !== "on") {
    return { status: "error", fieldErrors: { rights: ["Confirm you may use this image."] }, message: "Check the highlighted fields.", values: formValues(formData) };
  }

  let image;
  try {
    image = await preparePhoto(formData.get("file") as File, { width: 64, height: 64 });
  } catch (e) {
    if (e instanceof UploadError) return { status: "error", fieldErrors: { file: [e.message] }, message: e.message, values: formValues(formData) };
    throw e;
  }

  const supabase = await createClient();
  const path = `site/${randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from("public-media")
    .upload(path, image.data, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (uploadError) return { status: "error", message: "The image could not be stored. Please try again.", values: formValues(formData) };

  const { alt, caption, credit, illustrative } = details.data;
  const { error } = await supabase.from("media_assets").insert({
    bucket: "public-media",
    storage_path: path,
    alt_text: alt,
    caption,
    credit,
    is_illustrative: illustrative,
    mime_type: "image/webp",
    size_bytes: image.data.byteLength,
    width: image.width,
    height: image.height,
    uploaded_by: viewer.id,
  });
  if (error) {
    await supabase.storage.from("public-media").remove([path]);
    return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  }
  refresh();
  return { status: "success", message: "Uploaded. You can now choose it in the content editor." };
}

export async function updateMedia(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await admin())) return denied;
  const id = z.uuid().safeParse(formData.get("mediaId"));
  if (!id.success) return { status: "error", message: "That image could not be found." };
  const details = mediaDetailsFromForm(formData);
  if (!details.success) return fromZodError(details.error, formData);
  const { alt, caption, credit, illustrative } = details.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_assets")
    .update({ alt_text: alt, caption, credit, is_illustrative: illustrative, status: formData.get("active") === "on" ? "active" : "inactive" })
    .eq("id", id.data)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  if (!data) return { status: "error", message: "That image could not be found." };
  updateTag(CMS_TAG);
  refresh();
  return { status: "success", message: "Saved." };
}

/** Where an image is still used, so it is not deleted from under a live page. */
async function usesOf(id: string): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: sections }, { data: drafts }, { data: settings }] = await Promise.all([
    supabase.from("page_sections").select("id, label, published"),
    supabase.from("page_section_drafts").select("section_id, content"),
    supabase.from("site_settings").select("logo_media_id, favicon_media_id").eq("id", 1).maybeSingle(),
  ]);
  const uses = new Set<string>();
  const label = new Map((sections ?? []).map((s) => [s.id, s.label]));
  for (const s of sections ?? []) if (JSON.stringify(s.published ?? null).includes(id)) uses.add(s.label);
  for (const d of drafts ?? []) if (JSON.stringify(d.content).includes(id)) uses.add(`${label.get(d.section_id) ?? "A section"} (draft)`);
  if (settings?.logo_media_id === id) uses.add("Site logo");
  if (settings?.favicon_media_id === id) uses.add("Browser tab icon");
  return [...uses];
}

export async function deleteMedia(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await admin())) return denied;
  const id = z.uuid().safeParse(formData.get("mediaId"));
  if (!id.success) return { status: "error", message: "That image could not be found." };
  const uses = await usesOf(id.data);
  if (uses.length) return { status: "error", message: `This image is still used in: ${uses.join(", ")}. Choose another image there first.` };
  const supabase = await createClient();
  const { data: asset } = await supabase.from("media_assets").select("bucket, storage_path").eq("id", id.data).maybeSingle();
  if (!asset) return { status: "error", message: "That image could not be found." };
  // Only files the site uploaded itself are removed; hostel photos are never touched here.
  if (asset.storage_path?.startsWith("site/")) {
    const { error: removeError } = await supabase.storage.from(asset.bucket).remove([asset.storage_path]);
    if (removeError) return { status: "error", message: "The file could not be removed. Please try again." };
  }
  const { error } = await supabase.from("media_assets").delete().eq("id", id.data);
  if (error) return { status: "error", message: friendlyDbError(error) };
  updateTag(CMS_TAG);
  refresh();
  return { status: "success", message: "Deleted." };
}

"use server";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { authorize, AuthorizationError, type Viewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CMS_TAG } from "@/lib/cms/queries";
import { isSectionType, SECTION_SCHEMAS } from "@/lib/cms/schemas";
import { fromZodError, friendlyDbError, type FormState } from "@/lib/forms";
import type { Json } from "@/lib/supabase/database.types";

// Content editing. Drafts are validated against the section schema before they
// are saved and again before they are published; the database functions check
// the admin role and record a revision and an audit entry for every publish.

const denied: FormState = { status: "error", message: "Sign in with an administrator account to do that." };

async function admin(): Promise<Viewer | null> {
  try {
    return await authorize(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }
}

async function sectionById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("page_sections").select("id, type, published").eq("id", id).maybeSingle();
  return data;
}

export async function saveSection(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await admin();
  if (!viewer) return denied;
  const id = z.uuid().safeParse(formData.get("sectionId"));
  if (!id.success) return { status: "error", message: "That section could not be found." };
  const publish = formData.get("intent") === "publish";
  const section = await sectionById(id.data);
  if (!section || !isSectionType(section.type)) return { status: "error", message: "That section could not be found." };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("content") ?? ""));
  } catch {
    return { status: "error", message: "The editor sent something unreadable. Reload the page and try again." };
  }
  const parsed = SECTION_SCHEMAS[section.type].safeParse(raw);
  if (!parsed.success) {
    const state = fromZodError(parsed.error);
    const count = Object.keys(state.fieldErrors ?? {}).length;
    return { ...state, message: count === 1 ? "One field needs fixing before this can be saved." : `${count} fields need fixing before this can be saved.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("page_section_drafts")
    .upsert({ section_id: section.id, content: parsed.data as Json, updated_at: new Date().toISOString(), updated_by: viewer.id });
  if (error) return { status: "error", message: friendlyDbError(error) };
  if (publish) {
    const { error: pubError } = await supabase.rpc("publish_section", { p_section: section.id });
    if (pubError) return { status: "error", message: `Your draft was saved, but publishing failed. ${friendlyDbError(pubError)}` };
    updateTag(CMS_TAG);
  }
  refresh();
  return { status: "success", message: publish ? "Published. The change is live on the site." : "Draft saved. Preview it, then publish when ready." };
}

export type RestoreResult = { status: "success"; content: Json; message: string } | { status: "error"; message: string };

/** Copies an earlier version into the draft and hands it back to the editor. */
export async function restoreRevision(revisionId: number): Promise<RestoreResult> {
  if (!(await admin())) return { status: "error", message: denied.message! };
  if (!Number.isSafeInteger(revisionId) || revisionId < 1) return { status: "error", message: "That version could not be found." };
  const supabase = await createClient();
  const { data: sectionId, error } = await supabase.rpc("restore_revision_to_draft", { p_revision: revisionId });
  if (error || !sectionId) return { status: "error", message: friendlyDbError(error, "That version could not be found.") };
  const { data } = await supabase.from("page_section_drafts").select("content").eq("section_id", sectionId).maybeSingle();
  refresh();
  return { status: "success", content: data?.content ?? null, message: "Earlier version restored to the draft. Publish it to make it live." };
}

export async function unpublishSection(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await admin())) return denied;
  const id = z.uuid().safeParse(formData.get("sectionId"));
  if (!id.success) return { status: "error", message: "That section could not be found." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("unpublish_section", { p_section: id.data });
  if (error) return { status: "error", message: friendlyDbError(error) };
  updateTag(CMS_TAG);
  refresh();
  return { status: "success", message: "Taken off the site. Your draft is kept." };
}

/** Show or hide a section, or move it up or down the page. Takes effect immediately. */
export async function arrangeSection(formData: FormData): Promise<void> {
  if (!(await admin())) return;
  const id = z.uuid().safeParse(formData.get("sectionId"));
  const op = z.enum(["show", "hide", "up", "down"]).safeParse(formData.get("op"));
  if (!id.success || !op.success) return;
  const supabase = await createClient();
  if (op.data === "show" || op.data === "hide") {
    await supabase.from("page_sections").update({ is_visible: op.data === "show" }).eq("id", id.data);
  } else {
    const { data: me } = await supabase.from("page_sections").select("page_id").eq("id", id.data).maybeSingle();
    if (!me) return;
    const { data: all } = await supabase.from("page_sections").select("id, sort_order").eq("page_id", me.page_id).order("sort_order");
    const order = (all ?? []).map((s) => s.id);
    const from = order.indexOf(id.data);
    const to = op.data === "up" ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    // Renumber the whole page so earlier duplicate positions cannot stick.
    for (const [i, sid] of order.entries()) {
      const current = all!.find((s) => s.id === sid)!.sort_order;
      if (current !== (i + 1) * 10) await supabase.from("page_sections").update({ sort_order: (i + 1) * 10 }).eq("id", sid);
    }
  }
  updateTag(CMS_TAG);
  refresh();
}

const pageSchema = z.object({
  pageId: z.uuid(),
  title: z.string().trim().min(2, "Enter a title.").max(120),
  seo_title: z.string().trim().max(70, "Search engines cut titles after about 70 characters."),
  seo_description: z.string().trim().max(170, "Search engines cut descriptions after about 170 characters."),
});

export async function savePageDetails(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await admin();
  if (!viewer) return denied;
  const parsed = pageSchema.safeParse({
    pageId: formData.get("pageId"),
    title: formData.get("title") ?? "",
    seo_title: formData.get("seo_title") ?? "",
    seo_description: formData.get("seo_description") ?? "",
  });
  if (!parsed.success) return fromZodError(parsed.error, formData);
  const { pageId, title, seo_title, seo_description } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("pages")
    .update({ title, seo_title: seo_title || null, seo_description: seo_description || null, updated_by: viewer.id })
    .eq("id", pageId);
  if (error) return { status: "error", message: friendlyDbError(error) };
  updateTag(CMS_TAG);
  refresh();
  return { status: "success", message: "Page details saved. They are live straight away." };
}

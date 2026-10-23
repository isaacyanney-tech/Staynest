"use server";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { authorize, AuthorizationError, type Viewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CMS_TAG } from "@/lib/cms/queries";
import { bannerFromForm, isSiteGroup, navItemFromForm, siteGroupFromForm } from "@/lib/admin/schemas";
import { formValues, fromZodError, friendlyDbError, type FormState } from "@/lib/forms";
import type { Json } from "@/lib/supabase/database.types";

// Site-wide settings, navigation and banners. All are read by every public
// page, so each change invalidates the CMS cache tag.

const denied: FormState = { status: "error", message: "Sign in with an administrator account to do that." };

async function admin(): Promise<Viewer | null> {
  try {
    return await authorize(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }
}

function done(message: string): FormState {
  updateTag(CMS_TAG);
  refresh();
  return { status: "success", message };
}

export async function saveSiteSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await admin();
  if (!viewer) return denied;
  const group = formData.get("group");
  if (!isSiteGroup(group)) return { status: "error", message: "Unknown settings group." };
  const parsed = siteGroupFromForm(group, formData);
  if (!parsed.success) return fromZodError(parsed.error, formData);

  const supabase = await createClient();
  // Identity fields are columns; every other group is one JSON column.
  const patch = group === "identity" ? parsed.data : { [group]: parsed.data as Json };
  const { error } = await supabase
    .from("site_settings")
    .update({ ...patch, updated_by: viewer.id })
    .eq("id", 1);
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  return done("Saved. The change is live on every page.");
}

export async function saveNavItem(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await admin())) return denied;
  const parsed = navItemFromForm(formData);
  if (!parsed.success) return fromZodError(parsed.error, formData);
  const { id, ...item } = parsed.data;
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("navigation_items").update(item).eq("id", id);
    if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
    return done("Link saved.");
  }
  const { data: last } = await supabase
    .from("navigation_items")
    .select("sort_order")
    .eq("location", item.location)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("navigation_items").insert({ ...item, sort_order: (last?.sort_order ?? 0) + 10 });
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  return done("Link added.");
}

/** Move a link up or down within its menu, or delete it. */
export async function arrangeNavItem(formData: FormData): Promise<void> {
  if (!(await admin())) return;
  const id = z.uuid().safeParse(formData.get("id"));
  const op = z.enum(["up", "down", "delete"]).safeParse(formData.get("op"));
  if (!id.success || !op.success) return;
  const supabase = await createClient();
  if (op.data === "delete") {
    await supabase.from("navigation_items").delete().eq("id", id.data);
  } else {
    const { data: me } = await supabase.from("navigation_items").select("location").eq("id", id.data).maybeSingle();
    if (!me) return;
    const { data: all } = await supabase.from("navigation_items").select("id, sort_order").eq("location", me.location).order("sort_order").order("label");
    const order = (all ?? []).map((n) => n.id);
    const from = order.indexOf(id.data);
    const to = op.data === "up" ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    for (const [i, nid] of order.entries()) {
      if (all!.find((n) => n.id === nid)!.sort_order !== (i + 1) * 10) {
        await supabase.from("navigation_items").update({ sort_order: (i + 1) * 10 }).eq("id", nid);
      }
    }
  }
  updateTag(CMS_TAG);
  refresh();
}

export async function saveBanner(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await admin();
  if (!viewer) return denied;
  const parsed = bannerFromForm(formData);
  if (!parsed.success) return fromZodError(parsed.error, formData);
  const { id, ...banner } = parsed.data;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("promo_banners").update({ ...banner, updated_by: viewer.id }).eq("id", id)
    : await supabase.from("promo_banners").insert({ ...banner, updated_by: viewer.id });
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  return done(banner.is_active ? "Banner saved. It shows during the dates you set." : "Banner saved. It is switched off.");
}

export async function deleteBanner(formData: FormData): Promise<void> {
  if (!(await admin())) return;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("promo_banners").delete().eq("id", id.data);
  updateTag(CMS_TAG);
  refresh();
}

"use server";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { authorize, AuthorizationError, type Viewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HOSTELS_TAG } from "@/lib/hostels/queries";
import { BILLING_TAG } from "@/lib/billing/queries";
import { CMS_TAG } from "@/lib/cms/queries";
import { formValues, fromZodError, friendlyDbError, type FormState } from "@/lib/forms";
import { businessValue, moderationSchema, planFromForm, userAccessSchema, verificationDecisionSchema } from "@/lib/admin/schemas";

// Every action re-checks the admin role here; row-level security and the
// database guards check it again and write the audit log.

const denied: FormState = { status: "error", message: "Sign in with an administrator account to do that." };

async function admin(): Promise<Viewer | null> {
  try {
    return await authorize(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }
}

// ------------------------------------------------------------------ listings

const NEXT_STATUS = { publish: "published", reject: "rejected", suspend: "suspended" } as const;

export async function moderateListing(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await admin())) return denied;
  const parsed = moderationSchema.safeParse({
    hostelId: formData.get("hostelId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return fromZodError(parsed.error, formData);
  const { hostelId, decision, note } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hostels")
    .update({ status: NEXT_STATUS[decision], moderation_note: decision === "publish" ? null : note })
    .eq("id", hostelId)
    .select("slug")
    .maybeSingle();
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  if (!data) return { status: "error", message: "That listing could not be found." };
  updateTag(HOSTELS_TAG);
  updateTag(`hostel:${data.slug}`);
  refresh();
  const done = {
    publish: "Published. The listing is now live.",
    reject: "Sent back to the owner with your note.",
    suspend: "Suspended. The listing is hidden from students.",
  };
  return { status: "success", message: done[decision] };
}

// ------------------------------------------------------------------ verification

export async function decideVerification(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await admin())) return denied;
  const parsed = verificationDecisionSchema.safeParse({
    applicationId: formData.get("applicationId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return fromZodError(parsed.error, formData);
  const { applicationId, decision, note } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("verification_applications")
    .update({ status: decision, reviewer_note: note || null })
    .eq("id", applicationId)
    .in("status", ["pending", "needs_info"])
    .select("hostels(slug)")
    .maybeSingle();
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  if (!data) return { status: "error", message: "This request was already decided." };
  // Approving or rejecting changes the public verified badge.
  updateTag(HOSTELS_TAG);
  if (data.hostels?.slug) updateTag(`hostel:${data.hostels.slug}`);
  refresh();
  const done = {
    approved: "Approved. The listing now shows the verified badge.",
    needs_info: "Sent to the owner with your question.",
    rejected: "Rejected. The owner can see your reason and apply again.",
  };
  return { status: "success", message: done[decision] };
}

// ------------------------------------------------------------------ people

export async function updateUserAccess(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await admin();
  if (!viewer) return denied;
  const parsed = userAccessSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    suspended: formData.get("suspended") === "on",
  });
  if (!parsed.success) return fromZodError(parsed.error, formData);
  if (parsed.data.userId === viewer.id) {
    return { status: "error", message: "You cannot change your own role or suspend yourself. Ask another administrator." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role, is_suspended: parsed.data.suspended })
    .eq("id", parsed.data.userId)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", message: friendlyDbError(error) };
  if (!data) return { status: "error", message: "That account could not be found." };
  refresh();
  return { status: "success", message: "Access updated." };
}

// ------------------------------------------------------------------ plans

export async function savePlan(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await admin())) return denied;
  const parsed = planFromForm(formData);
  if (!parsed.success) return fromZodError(parsed.error, formData);
  const { id, makeDefault, ...plan } = parsed.data;

  const supabase = await createClient();
  const { data: current } = await supabase.from("plans").select("is_default").eq("id", id).maybeSingle();
  if (!current) return { status: "error", message: "That plan could not be found." };
  if (current.is_default && !plan.is_active) {
    return { status: "error", message: "The default plan must stay active. Make another plan the default first." };
  }
  if (makeDefault && !current.is_default) {
    if (!plan.is_active) return { status: "error", message: "Only an active plan can be the default." };
    // One default at a time (a unique index enforces it), so clear the old one first.
    const { error } = await supabase.from("plans").update({ is_default: false }).eq("is_default", true);
    if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  }
  const { error } = await supabase
    .from("plans")
    .update({ ...plan, ...(makeDefault ? { is_default: true } : {}) })
    .eq("id", id);
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  updateTag(BILLING_TAG);
  refresh();
  return { status: "success", message: `Saved ${plan.name}.` };
}

// ------------------------------------------------------------------ business settings

export async function saveBusinessSetting(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await admin())) return denied;
  const key = z.string().regex(/^[a-z0-9_.]+$/).safeParse(formData.get("key"));
  if (!key.success) return { status: "error", message: "That setting could not be found." };
  const supabase = await createClient();
  const { data: current } = await supabase.from("business_settings").select("value").eq("key", key.data).maybeSingle();
  if (!current) return { status: "error", message: "That setting could not be found." };
  // The new value must keep the type of the stored one (number, yes/no or text).
  const next = businessValue(key.data, current.value, formData.get("value"));
  if (!next.ok) return { status: "error", fieldErrors: { value: [next.message] }, message: next.message, values: formValues(formData) };
  const { error } = await supabase.from("business_settings").update({ value: next.value }).eq("key", key.data);
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  updateTag(CMS_TAG);
  updateTag(BILLING_TAG);
  refresh();
  return { status: "success", message: "Saved." };
}

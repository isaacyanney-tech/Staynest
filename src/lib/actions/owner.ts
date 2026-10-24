"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { authorize, AuthorizationError, type Viewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HOSTELS_TAG } from "@/lib/hostels/queries";
import { slugify } from "@/lib/format";
import { formValues, fromZodError, friendlyDbError, type FormState } from "@/lib/forms";
import { altSchema, captionSchema, hostelFromForm, inspectionResponseSchema, roomFromForm, type HostelInput } from "@/lib/owner/schemas";
import { prepareDocument, preparePhoto, UploadError } from "@/lib/uploads";

// Every action re-checks the role here, and row-level security and triggers
// check ownership again in the database. Ids from the form are only used to
// look rows up through the owner's own (RLS-limited) client.

const id = z.uuid();
const denied: FormState = { status: "error", message: "Sign in with an owner account to do that." };

async function owner(): Promise<Viewer | null> {
  try {
    return await authorize(["owner"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }
}

/** Expires public hostel pages, search and the homepage after an owner change. */
function publicChanged(slug?: string) {
  updateTag(HOSTELS_TAG);
  if (slug) updateTag(`hostel:${slug}`);
}

function hostelColumns(h: HostelInput) {
  return {
    name: h.name,
    summary: h.summary,
    description: h.description,
    university_id: h.universityId,
    address: h.address,
    area: h.area,
    city: h.city,
    distance_km: h.distanceKm,
    gender_policy: h.gender,
    amenities: h.amenities,
    house_rules: h.houseRules,
    contact_phone: h.contactPhone,
  };
}

// ------------------------------------------------------------------ hostels

export async function createHostel(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await owner();
  if (!viewer) return denied;
  const parsed = hostelFromForm(formData);
  if (!parsed.success) return fromZodError(parsed.error, formData);

  const supabase = await createClient();
  const base = slugify(parsed.data.name) || "hostel";
  // A short random suffix keeps slugs unique without revealing how many exist.
  const slug = `${base}-${randomUUID().slice(0, 6)}`;
  const { data, error } = await supabase
    .from("hostels")
    .insert({ ...hostelColumns(parsed.data), slug, owner_id: viewer.id, status: "draft" })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  redirect(`/dashboard/owner/hostels/${data.id}?created=1`);
}

export async function updateHostel(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await owner();
  if (!viewer) return denied;
  const hostelId = id.safeParse(formData.get("hostelId"));
  if (!hostelId.success) return { status: "error", message: "That listing could not be found." };
  const parsed = hostelFromForm(formData);
  if (!parsed.success) return fromZodError(parsed.error, formData);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hostels")
    .update(hostelColumns(parsed.data))
    .eq("id", hostelId.data)
    .eq("owner_id", viewer.id)
    .select("slug, status")
    .maybeSingle();
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  if (!data) return { status: "error", message: "That listing could not be found." };
  if (data.status === "published") publicChanged(data.slug);
  refresh();
  return { status: "success", message: data.status === "published" ? "Saved. Changes are live on your listing." : "Saved." };
}

export async function submitForReview(formData: FormData): Promise<void> {
  const viewer = await authorize(["owner"]);
  const hostelId = id.parse(formData.get("hostelId"));
  const supabase = await createClient();
  const { data: hostel } = await supabase
    .from("hostels")
    .select("status, summary, room_types(count), hostel_media(count)")
    .eq("id", hostelId)
    .eq("owner_id", viewer.id)
    .maybeSingle();
  if (!hostel) throw new Error("That listing could not be found.");
  const rooms = (hostel.room_types as unknown as { count: number }[])[0]?.count ?? 0;
  const photos = (hostel.hostel_media as unknown as { count: number }[])[0]?.count ?? 0;
  if (!hostel.summary || rooms === 0 || photos === 0) {
    redirect(`/dashboard/owner/hostels/${hostelId}?incomplete=1`);
  }
  const { error } = await supabase.from("hostels").update({ status: "pending_review" }).eq("id", hostelId).eq("owner_id", viewer.id);
  if (error) throw new Error(friendlyDbError(error));
  refresh();
}

export async function withdrawFromReview(formData: FormData): Promise<void> {
  const viewer = await authorize(["owner"]);
  const hostelId = id.parse(formData.get("hostelId"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("hostels")
    .update({ status: "draft" })
    .eq("id", hostelId)
    .eq("owner_id", viewer.id)
    .in("status", ["pending_review", "rejected"]);
  if (error) throw new Error(friendlyDbError(error));
  refresh();
}

export async function deleteDraft(formData: FormData): Promise<void> {
  const viewer = await authorize(["owner"]);
  const hostelId = id.parse(formData.get("hostelId"));
  const supabase = await createClient();
  const { data: hostel } = await supabase
    .from("hostels")
    .select("status, hostel_media(storage_path)")
    .eq("id", hostelId)
    .eq("owner_id", viewer.id)
    .maybeSingle();
  if (!hostel || (hostel.status !== "draft" && hostel.status !== "rejected")) {
    throw new Error("Only drafts and listings that need changes can be deleted.");
  }
  // Files go first: the storage policy checks hostel ownership, which ends
  // once the hostel row is deleted.
  const paths = hostel.hostel_media.map((m) => m.storage_path).filter((p): p is string => Boolean(p));
  if (paths.length) await supabase.storage.from("public-media").remove(paths);
  const { error } = await supabase.from("hostels").delete().eq("id", hostelId).eq("owner_id", viewer.id).in("status", ["draft", "rejected"]);
  if (error) throw new Error(friendlyDbError(error));
  redirect("/dashboard/owner?deleted=1");
}

// ------------------------------------------------------------------ rooms

async function hostelSlug(supabase: Awaited<ReturnType<typeof createClient>>, hostelId: string) {
  const { data } = await supabase.from("hostels").select("slug, status").eq("id", hostelId).maybeSingle();
  return data;
}

export async function saveRoom(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await owner();
  if (!viewer) return denied;
  const hostelId = id.safeParse(formData.get("hostelId"));
  const roomId = formData.get("roomId") ? id.safeParse(formData.get("roomId")) : null;
  if (!hostelId.success || (roomId && !roomId.success)) return { status: "error", message: "That room could not be found." };
  const parsed = roomFromForm(formData);
  if (!parsed.success) return fromZodError(parsed.error, formData);

  const supabase = await createClient();
  const row = {
    name: parsed.data.name,
    occupancy: parsed.data.occupancy,
    price_amount: parsed.data.price,
    price_period: parsed.data.period,
    total_rooms: parsed.data.total,
    available_rooms: parsed.data.available,
    description: parsed.data.description,
  };
  const { error } = roomId?.success
    ? await supabase.from("room_types").update(row).eq("id", roomId.data).eq("hostel_id", hostelId.data)
    : await supabase.from("room_types").insert({ ...row, hostel_id: hostelId.data, sort_order: Date.now() % 1_000_000 });
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  const hostel = await hostelSlug(supabase, hostelId.data);
  if (hostel?.status === "published") publicChanged(hostel.slug);
  refresh();
  return { status: "success", message: roomId ? "Room updated." : "Room added." };
}

export async function deleteRoom(formData: FormData): Promise<void> {
  await authorize(["owner"]);
  const roomId = id.parse(formData.get("roomId"));
  const hostelId = id.parse(formData.get("hostelId"));
  const supabase = await createClient();
  const { error } = await supabase.from("room_types").delete().eq("id", roomId).eq("hostel_id", hostelId);
  if (error) throw new Error(friendlyDbError(error));
  const hostel = await hostelSlug(supabase, hostelId);
  if (hostel?.status === "published") publicChanged(hostel.slug);
  refresh();
}

// ------------------------------------------------------------------ photos

export async function uploadPhoto(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await owner();
  if (!viewer) return denied;
  const hostelId = id.safeParse(formData.get("hostelId"));
  if (!hostelId.success) return { status: "error", message: "That listing could not be found." };
  const alt = altSchema.safeParse(formData.get("alt") ?? "");
  if (!alt.success) return { status: "error", fieldErrors: { alt: [alt.error.issues[0].message] }, message: "Check the highlighted fields.", values: formValues(formData) };
  const caption = captionSchema.parse(String(formData.get("caption") ?? "").slice(0, 200));

  let photo;
  try {
    photo = await preparePhoto(formData.get("photo") as File);
  } catch (e) {
    if (e instanceof UploadError) return { status: "error", fieldErrors: { photo: [e.message] }, message: e.message, values: formValues(formData) };
    throw e;
  }

  const supabase = await createClient();
  const path = `hostels/${hostelId.data}/${randomUUID()}.webp`;
  const { data: last } = await supabase
    .from("hostel_media")
    .select("sort_order")
    .eq("hostel_id", hostelId.data)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  // The row goes in first so the plan's photo limit is checked before any upload.
  const { data: row, error } = await supabase
    .from("hostel_media")
    .insert({ hostel_id: hostelId.data, storage_path: path, alt_text: alt.data, caption, width: photo.width, height: photo.height, sort_order: (last?.sort_order ?? -1) + 1 })
    .select("id")
    .single();
  if (error || !row) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };

  const { error: uploadError } = await supabase.storage
    .from("public-media")
    .upload(path, photo.data, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (uploadError) {
    await supabase.from("hostel_media").delete().eq("id", row.id);
    return { status: "error", message: "The photo could not be stored. Please try again.", values: formValues(formData) };
  }
  const hostel = await hostelSlug(supabase, hostelId.data);
  if (hostel?.status === "published") publicChanged(hostel.slug);
  refresh();
  return { status: "success", message: "Photo added." };
}

export async function updatePhoto(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await owner();
  if (!viewer) return denied;
  const photoId = id.safeParse(formData.get("photoId"));
  const hostelId = id.safeParse(formData.get("hostelId"));
  if (!photoId.success || !hostelId.success) return { status: "error", message: "That photo could not be found." };
  const alt = altSchema.safeParse(formData.get("alt") ?? "");
  if (!alt.success) return { status: "error", fieldErrors: { alt: [alt.error.issues[0].message] }, message: alt.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("hostel_media")
    .update({ alt_text: alt.data, caption: captionSchema.parse(String(formData.get("caption") ?? "").slice(0, 200)) })
    .eq("id", photoId.data)
    .eq("hostel_id", hostelId.data);
  if (error) return { status: "error", message: friendlyDbError(error) };
  const hostel = await hostelSlug(supabase, hostelId.data);
  if (hostel?.status === "published") publicChanged(hostel.slug);
  refresh();
  return { status: "success", message: "Photo details saved." };
}

export async function deletePhoto(formData: FormData): Promise<void> {
  await authorize(["owner"]);
  const photoId = id.parse(formData.get("photoId"));
  const hostelId = id.parse(formData.get("hostelId"));
  const supabase = await createClient();
  const { data } = await supabase.from("hostel_media").delete().eq("id", photoId).eq("hostel_id", hostelId).select("storage_path").maybeSingle();
  if (data?.storage_path) await supabase.storage.from("public-media").remove([data.storage_path]);
  const hostel = await hostelSlug(supabase, hostelId);
  if (hostel?.status === "published") publicChanged(hostel.slug);
  refresh();
}

/** Moves a photo one place earlier or later; the first photo is the cover. */
export async function movePhoto(formData: FormData): Promise<void> {
  await authorize(["owner"]);
  const photoId = id.parse(formData.get("photoId"));
  const hostelId = id.parse(formData.get("hostelId"));
  const direction = z.enum(["earlier", "later", "cover"]).parse(formData.get("direction"));
  const supabase = await createClient();
  const { data: photos } = await supabase.from("hostel_media").select("id, sort_order").eq("hostel_id", hostelId).order("sort_order");
  const list = [...(photos ?? [])];
  const from = list.findIndex((p) => p.id === photoId);
  if (from < 0) return;
  const to = direction === "cover" ? 0 : direction === "earlier" ? from - 1 : from + 1;
  if (to < 0 || to >= list.length || to === from) return;
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);
  for (const [index, p] of list.entries()) {
    if (p.sort_order !== index) {
      const { error } = await supabase.from("hostel_media").update({ sort_order: index }).eq("id", p.id).eq("hostel_id", hostelId);
      if (error) throw new Error(friendlyDbError(error));
    }
  }
  const hostel = await hostelSlug(supabase, hostelId);
  if (hostel?.status === "published") publicChanged(hostel.slug);
  refresh();
}

// ------------------------------------------------------------------ verification

const DOC_TYPES = ["ownership", "identity", "business_registration", "other"] as const;

export async function requestVerification(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await owner();
  if (!viewer) return denied;
  const hostelId = id.safeParse(formData.get("hostelId"));
  if (!hostelId.success) return { status: "error", message: "That listing could not be found." };
  const note = z.string().trim().max(2000, "Keep the note under 2,000 characters.").safeParse(formData.get("note") ?? "");
  if (!note.success) return fromZodError(note.error, formData);

  const files: { file: File; type: (typeof DOC_TYPES)[number] }[] = [];
  for (const type of DOC_TYPES) {
    const file = formData.get(`doc_${type}`);
    if (file instanceof File && file.size > 0) files.push({ file, type });
  }
  const supabase = await createClient();
  // Answering a "needs more information" request adds to the open application.
  const { data: open } = await supabase
    .from("verification_applications")
    .select("id, status")
    .eq("hostel_id", hostelId.data)
    .eq("owner_id", viewer.id)
    .in("status", ["pending", "needs_info"])
    .maybeSingle();
  if (open?.status === "pending") {
    return { status: "error", message: "This hostel already has a verification request in progress." };
  }
  if (open) {
    if (files.length === 0) return { status: "error", message: "Add at least one document that answers the reviewer's question." };
  } else {
    if (!files.some((f) => f.type === "ownership")) {
      return { status: "error", fieldErrors: { doc_ownership: ["Add proof of ownership or management rights."] }, message: "Check the highlighted fields." };
    }
    if (!files.some((f) => f.type === "identity")) {
      return { status: "error", fieldErrors: { doc_identity: ["Add a photo ID, such as a Ghana Card."] }, message: "Check the highlighted fields." };
    }
  }

  const prepared = [];
  try {
    for (const f of files) prepared.push({ ...f, ...(await prepareDocument(f.file)) });
  } catch (e) {
    if (e instanceof UploadError) return { status: "error", message: e.message };
    throw e;
  }

  let app: { id: string } | null = open ? { id: open.id } : null;
  if (!app) {
    const { data, error } = await supabase
      .from("verification_applications")
      .insert({ hostel_id: hostelId.data, owner_id: viewer.id, owner_note: note.data })
      .select("id")
      .single();
    if (error || !data) {
      return { status: "error", message: error?.code === "23505" ? "This hostel already has a verification request in progress." : friendlyDbError(error) };
    }
    app = data;
  }
  const isNew = !open;

  const stored: string[] = [];
  for (const doc of prepared) {
    const path = `${viewer.id}/${app.id}/${randomUUID()}.${doc.ext}`;
    const { error: uploadError } = await supabase.storage.from("verification-docs").upload(path, doc.data, { contentType: doc.contentType, upsert: false });
    const { error: rowError } = uploadError
      ? { error: uploadError }
      : await supabase.from("verification_documents").insert({
          application_id: app.id,
          storage_path: path,
          doc_type: doc.type,
          file_name: doc.file.name.replace(/[^\w.() -]/g, "_").slice(0, 120) || `${doc.type}.${doc.ext}`,
        });
    if (uploadError || rowError) {
      // Leave nothing half-submitted: remove what was stored and the application.
      if (stored.length) await supabase.storage.from("verification-docs").remove(stored);
      if (isNew) await supabase.from("verification_applications").delete().eq("id", app.id);
      return { status: "error", message: "Your documents could not be stored. Please try again." };
    }
    stored.push(path);
  }
  if (!isNew) {
    const { error } = await supabase
      .from("verification_applications")
      .update({ status: "pending", owner_note: note.data })
      .eq("id", app.id);
    if (error) return { status: "error", message: friendlyDbError(error) };
  }
  refresh();
  return { status: "success", message: "Sent. We usually review documents within three working days." };
}

// ------------------------------------------------------------------ inspections

export async function respondToInspection(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await owner();
  if (!viewer) return denied;
  const parsed = inspectionResponseSchema.safeParse({
    id: formData.get("id"),
    decision: formData.get("decision"),
    reply: formData.get("reply") ?? "",
    proposedDate: formData.get("proposedDate") ?? "",
  });
  if (!parsed.success) return fromZodError(parsed.error, formData);
  if (parsed.data.proposedDate && parsed.data.proposedDate < new Date().toISOString().slice(0, 10)) {
    return { status: "error", fieldErrors: { proposedDate: ["Choose a date from today onwards."] }, message: "Check the highlighted fields." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_requests")
    .update({
      status: parsed.data.decision,
      owner_response: parsed.data.reply || null,
      proposed_date: parsed.data.decision === "rescheduled" ? parsed.data.proposedDate : null,
    })
    .eq("id", parsed.data.id)
    .not("status", "in", "(cancelled,completed)")
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  if (!data) return { status: "error", message: "This request was cancelled or already closed." };
  refresh();
  const done = { accepted: "Accepted. The student can see your reply.", declined: "Declined.", rescheduled: "New date sent to the student.", completed: "Marked as completed." };
  return { status: "success", message: done[parsed.data.decision] };
}

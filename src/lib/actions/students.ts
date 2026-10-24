"use server";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { authorize, AuthorizationError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formValues, fromZodError, friendlyDbError, type FormState } from "@/lib/forms";
import { HOSTELS_TAG } from "@/lib/hostels/queries";
import { RATINGS_TAG } from "@/lib/hostels/ratings";
import { ratingSchema } from "@/lib/hostels/rating-schema";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const inspectionSchema = z.object({
  hostelId: z.uuid(),
  roomTypeId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  preferredDate: z
    .string()
    .regex(isoDate, "Choose a date.")
    .refine((v) => {
      const today = new Date().toISOString().slice(0, 10);
      return v >= today;
    }, "Choose a date from today onwards.")
    .refine((v) => {
      const limit = new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10);
      return v <= limit;
    }, "Choose a date within the next four months."),
  preferredTime: z.enum(["morning", "afternoon", "evening"], "Choose a time of day."),
  message: z.string().trim().max(1000, "Keep your message under 1,000 characters.").default(""),
});

export async function requestInspection(_prev: FormState, formData: FormData): Promise<FormState> {
  let viewer;
  try {
    viewer = await authorize(["student"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return { status: "error", message: "Sign in with a student account to request an inspection." };
    throw e;
  }
  const parsed = inspectionSchema.safeParse({
    hostelId: formData.get("hostelId"),
    roomTypeId: formData.get("roomTypeId") ?? "",
    preferredDate: formData.get("preferredDate"),
    preferredTime: formData.get("preferredTime"),
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) return fromZodError(parsed.error, formData);

  const supabase = await createClient();
  const { error } = await supabase.from("inspection_requests").insert({
    hostel_id: parsed.data.hostelId,
    student_id: viewer.id,
    room_type_id: parsed.data.roomTypeId,
    preferred_date: parsed.data.preferredDate,
    preferred_time: parsed.data.preferredTime,
    message: parsed.data.message,
  });
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  refresh();
  return { status: "success", message: "Request sent. The owner will reply in your dashboard, usually within two days." };
}

export async function cancelInspection(formData: FormData): Promise<void> {
  const viewer = await authorize(["student"]);
  const id = z.uuid().parse(formData.get("id"));
  const supabase = await createClient();
  // RLS limits this to the student's own requests; the trigger allows only cancelling.
  const { error } = await supabase
    .from("inspection_requests")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("student_id", viewer.id)
    .in("status", ["requested", "accepted", "rescheduled"]);
  if (error) throw new Error(friendlyDbError(error));
  refresh();
}

export async function toggleSaved(hostelId: string, save: boolean): Promise<{ saved: boolean; error?: string }> {
  let viewer;
  try {
    viewer = await authorize(["student", "owner", "admin"]);
  } catch {
    return { saved: !save, error: "Sign in to save hostels." };
  }
  const id = z.uuid().safeParse(hostelId);
  if (!id.success) return { saved: !save, error: "That hostel could not be found." };
  const supabase = await createClient();
  const { error } = save
    ? await supabase.from("saved_hostels").upsert({ user_id: viewer.id, hostel_id: id.data }, { ignoreDuplicates: true })
    : await supabase.from("saved_hostels").delete().eq("user_id", viewer.id).eq("hostel_id", id.data);
  if (error) return { saved: !save, error: friendlyDbError(error) };
  return { saved: save };
}

function ratingChanged(hostelId: string) {
  // Averages appear on cards everywhere, so every hostel listing is refreshed.
  updateTag(RATINGS_TAG);
  updateTag(HOSTELS_TAG);
  updateTag(`ratings:${hostelId}`);
  refresh();
}

export async function saveRating(_prev: FormState, formData: FormData): Promise<FormState> {
  let viewer;
  try {
    viewer = await authorize(["student"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return { status: "error", message: "Sign in with a student account to rate a hostel." };
    throw e;
  }
  const parsed = ratingSchema.safeParse({
    hostelId: formData.get("hostelId"),
    stars: formData.get("stars"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) return fromZodError(parsed.error, formData);

  const supabase = await createClient();
  // The database checks the student had an accepted inspection; a second
  // submission updates the same row rather than adding another.
  const { error } = await supabase.from("hostel_ratings").upsert(
    { hostel_id: parsed.data.hostelId, student_id: viewer.id, stars: parsed.data.stars, comment: parsed.data.comment },
    { onConflict: "hostel_id,student_id" },
  );
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  ratingChanged(parsed.data.hostelId);
  return { status: "success", message: "Thanks. Your rating is live." };
}

export async function deleteRating(formData: FormData): Promise<void> {
  const viewer = await authorize(["student"]);
  const hostelId = z.uuid().parse(formData.get("hostelId"));
  const supabase = await createClient();
  const { error } = await supabase.from("hostel_ratings").delete().eq("hostel_id", hostelId).eq("student_id", viewer.id);
  if (error) throw new Error(friendlyDbError(error));
  ratingChanged(hostelId);
}

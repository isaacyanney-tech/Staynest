"use server";
import { refresh } from "next/cache";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { passwordChangeSchema, profileSchema } from "@/lib/account/schemas";
import { formValues, fromZodError, friendlyDbError, type FormState } from "@/lib/forms";

// Any signed-in account can change its own name, phone and password. The
// profiles update policy and guard trigger limit the row to the user's own,
// and stop role or suspension changes from here.

const signedOut: FormState = { status: "error", message: "Your session has ended. Sign in again to make changes." };

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return signedOut;
  const parsed = profileSchema.safeParse({ fullName: formData.get("fullName") ?? "", phone: formData.get("phone") ?? "" });
  if (!parsed.success) return fromZodError(parsed.error, formData);
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq("id", viewer.id);
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  refresh();
  return { status: "success", message: "Saved. Your details are up to date." };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return signedOut;
  const parsed = passwordChangeSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const message =
      error.code === "same_password"
        ? "Choose a password you have not used before."
        : error.code === "weak_password"
          ? "Choose a stronger password."
          : error.code === "reauthentication_needed"
            ? "For your security, sign out and sign in again, then change your password."
            : "We could not change your password. Please try again.";
    return { status: "error", message };
  }
  return { status: "success", message: "Password changed. Use the new one next time you sign in." };
}

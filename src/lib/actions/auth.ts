"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { homeFor, landingFor, type Role } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { formValues, fromZodError, type FormState } from "@/lib/forms";
import { safeNext } from "@/lib/safe-next";
import { newPassword, passwordChangeSchema } from "@/lib/account/schemas";

const email = z.email("Enter a valid email address.").trim().toLowerCase().max(254);

const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(72),
});

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  return doSignIn(formData, "site");
}

export async function adminSignIn(_prev: FormState, formData: FormData): Promise<FormState> {
  return doSignIn(formData, "admin");
}

async function doSignIn(formData: FormData, area: "site" | "admin"): Promise<FormState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fromZodError(parsed.error, formData);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  const invalid: FormState = { status: "error", message: "That email and password do not match an account.", values: formValues(formData) };
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return { status: "error", message: "Confirm your email address first. We sent you a link when you signed up.", values: formValues(formData) };
    }
    return invalid;
  }

  const { data: profile } = await supabase.from("profiles").select("role, is_suspended").eq("id", data.user.id).maybeSingle();
  if (!profile || profile.is_suspended) {
    await supabase.auth.signOut();
    return { status: "error", message: "This account is suspended. Contact us if you think this is a mistake." };
  }
  if (area === "admin" && profile.role !== "admin") {
    // Same message as a wrong password, so the admin sign-in reveals nothing.
    await supabase.auth.signOut();
    return invalid;
  }

  redirect(landingFor(profile.role as Role, safeNext(formData.get("next"))));
}

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  email,
  password: newPassword,
  role: z.enum(["student", "owner"], "Choose an account type."),
  terms: z.literal("on", "Accept the terms to continue."),
});

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) return fromZodError(parsed.error, formData);

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // The database trigger accepts only "student" or "owner"; anything else becomes student.
      data: { full_name: parsed.data.fullName, role: parsed.data.role },
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
    },
  });
  if (error) {
    const message =
      error.code === "weak_password"
        ? "Choose a stronger password."
        : error.code === "over_email_send_rate_limit"
          ? "Too many attempts. Wait a minute and try again."
          : "We could not create your account. Please try again.";
    return { status: "error", message, values: formValues(formData) };
  }
  if (data.session) redirect(next ?? homeFor(parsed.data.role));
  // With email confirmation on, Supabase returns no session. The message is the
  // same whether or not the address already has an account.
  return { status: "success", message: `Check ${parsed.data.email} for a link to confirm your account.` };
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ email }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return fromZodError(parsed.error, formData);
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`,
  });
  return { status: "success", message: "If an account uses that address, we have sent a link to reset the password." };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = passwordChangeSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { status: "error", message: "This reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      status: "error",
      message: error.code === "same_password" ? "Choose a password you have not used before." : "We could not update your password. Request a new link and try again.",
    };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  redirect(profile ? homeFor(profile.role) : "/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

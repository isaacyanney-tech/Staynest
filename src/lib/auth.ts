import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type Role = Enums<"app_role">;

export type Viewer = {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  phone: string | null;
};

/**
 * The signed-in user and their role, read on the server. getUser() validates
 * the session with Supabase Auth, and the role comes from the profiles table,
 * never from client input or editable user metadata.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, phone, is_suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.is_suspended) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    role: profile.role,
    fullName: profile.full_name,
    phone: profile.phone,
  };
});

export function homeFor(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "owner") return "/dashboard/owner";
  return "/dashboard/student";
}

/** Where to send someone after signing in: the requested page if their role may see it, else their home. */
export function landingFor(role: Role, next: string | null): string {
  return next && (role === "admin" || !next.startsWith("/admin")) ? next : homeFor(role);
}

/** For the sign-in and sign-up pages: people who are already signed in go straight on. */
export async function redirectIfSignedIn(next: string | null) {
  const viewer = await getViewer();
  if (viewer) redirect(landingFor(viewer.role, next));
}

/** For pages: redirects signed-out visitors, and sends wrong roles elsewhere. */
export async function requireRole(roles: Role[], area: "dashboard" | "admin" = "dashboard"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(area === "admin" ? "/admin/login" : "/sign-in");
  if (!roles.includes(viewer.role)) {
    // Do not reveal that admin pages exist to non-admins.
    if (area === "admin") notFound();
    redirect(homeFor(viewer.role));
  }
  return viewer;
}

export class AuthorizationError extends Error {}

/** For server actions: throws instead of redirecting so callers can report it. */
export async function authorize(roles: Role[]): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || !roles.includes(viewer.role)) {
    throw new AuthorizationError("You do not have permission to do that.");
  }
  return viewer;
}

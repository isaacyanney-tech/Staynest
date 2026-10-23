import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mediaUrl } from "@/lib/hostels/queries";
import { sanitizeTerm } from "@/lib/hostels/search-params";
import type { Enums, Tables } from "@/lib/supabase/database.types";
import type { AuditEntry } from "./audit";

// Admin reads use the signed-in client: row-level security grants admins
// access, so a non-admin session gets nothing back even if a page forgot to
// check the role. Pages still call requireRole(["admin"], "admin") first.

export const ADMIN_PAGE_SIZE = 25;

async function namesFor(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((i): i is string => Boolean(i)))];
  if (unique.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p.full_name || "Unnamed account"]));
}

// ------------------------------------------------------------------ activity

export async function getAuditLog({ limit = 50, entity, page = 1 }: { limit?: number; entity?: string; page?: number } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("id, actor_id, action, entity, entity_id, details, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (entity) query = query.eq("entity", entity);
  const { data, count } = await query;
  const names = await namesFor((data ?? []).map((r) => r.actor_id));
  const entries: AuditEntry[] = (data ?? []).map((r) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    details: r.details,
    createdAt: r.created_at,
    actorName: r.actor_id ? (names.get(r.actor_id) ?? "Deleted account") : null,
  }));
  return { entries, total: count ?? 0 };
}

// ------------------------------------------------------------------ listings

export type AdminListingRow = Pick<Tables<"hostels">, "id" | "slug" | "name" | "status" | "area" | "city" | "is_verified" | "is_demo" | "updated_at"> & {
  ownerName: string | null;
};

export async function getAdminListings({ status, q, page = 1 }: { status?: Enums<"listing_status">; q?: string; page?: number }) {
  const supabase = await createClient();
  let query = supabase
    .from("hostels")
    .select("id, slug, name, status, area, city, is_verified, is_demo, updated_at, owner_id", { count: "exact" })
    .order("updated_at", { ascending: status === "pending_review" })
    .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  const term = q ? sanitizeTerm(q) : "";
  if (term) query = query.or(`name.ilike.%${term}%,area.ilike.%${term}%,city.ilike.%${term}%`);
  const { data, count } = await query;
  const names = await namesFor((data ?? []).map((h) => h.owner_id));
  const rows: AdminListingRow[] = (data ?? []).map(({ owner_id, ...h }) => ({ ...h, ownerName: owner_id ? (names.get(owner_id) ?? null) : null }));
  return { rows, total: count ?? 0 };
}

export async function getListingCounts() {
  const supabase = await createClient();
  const { data } = await supabase.from("hostels").select("status");
  const counts: Partial<Record<Enums<"listing_status">, number>> = {};
  for (const r of data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts;
}

export async function getAdminHostel(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("hostels")
    .select(
      "*, universities(name, short_name), room_types(*), hostel_media(id, storage_path, external_url, alt_text, caption, sort_order), " +
        "verification_applications(id, status, submitted_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Tables<"hostels"> & {
    universities: { name: string; short_name: string } | null;
    room_types: Tables<"room_types">[];
    hostel_media: { id: string; storage_path: string | null; external_url: string | null; alt_text: string; caption: string | null; sort_order: number }[];
    verification_applications: { id: string; status: Enums<"verification_status">; submitted_at: string }[];
  };
  const { room_types, hostel_media, verification_applications, universities, ...hostel } = row;
  const owner = hostel.owner_id
    ? (await supabase.from("profiles").select("id, full_name, phone, is_suspended").eq("id", hostel.owner_id).maybeSingle()).data
    : null;
  return {
    ...hostel,
    university: universities,
    owner,
    rooms: [...room_types].sort((a, b) => a.sort_order - b.sort_order),
    photos: [...hostel_media].sort((a, b) => a.sort_order - b.sort_order).map((m) => ({ id: m.id, url: mediaUrl(m), alt: m.alt_text, caption: m.caption })),
    verifications: [...verification_applications].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)),
  };
}

export type AdminHostel = NonNullable<Awaited<ReturnType<typeof getAdminHostel>>>;

// ------------------------------------------------------------------ verification

export async function getVerificationQueue(status: Enums<"verification_status"> | undefined, page = 1) {
  const supabase = await createClient();
  let query = supabase
    .from("verification_applications")
    .select("id, status, submitted_at, reviewed_at, owner_id, hostels(id, name, area), verification_documents(count)", { count: "exact" })
    .order("submitted_at", { ascending: status === "pending" })
    .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  const { data, count } = await query;
  const names = await namesFor((data ?? []).map((a) => a.owner_id));
  return {
    rows: (data ?? []).map((a) => ({
      id: a.id,
      status: a.status,
      submittedAt: a.submitted_at,
      reviewedAt: a.reviewed_at,
      hostel: a.hostels,
      ownerName: names.get(a.owner_id) ?? null,
      documentCount: (a.verification_documents as unknown as { count: number }[])[0]?.count ?? 0,
    })),
    total: count ?? 0,
  };
}

/** One application with short-lived signed links to its private documents. */
export async function getVerification(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("verification_applications")
    .select("*, hostels(id, name, slug, area, city, status, is_verified), verification_documents(id, doc_type, file_name, storage_path, created_at)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const docs = [...data.verification_documents].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const { data: signed } = docs.length
    ? await supabase.storage.from("verification-docs").createSignedUrls(
        docs.map((d) => d.storage_path),
        600,
      )
    : { data: [] };
  const urlFor = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));
  const names = await namesFor([data.owner_id, data.reviewer_id]);
  const { data: owner } = await supabase.from("profiles").select("full_name, phone").eq("id", data.owner_id).maybeSingle();
  const { data: history } = await supabase
    .from("verification_applications")
    .select("id, status, submitted_at, reviewer_note")
    .eq("hostel_id", data.hostel_id)
    .neq("id", data.id)
    .order("submitted_at", { ascending: false });
  return {
    id: data.id,
    status: data.status,
    ownerNote: data.owner_note,
    reviewerNote: data.reviewer_note,
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
    reviewerName: data.reviewer_id ? (names.get(data.reviewer_id) ?? null) : null,
    hostel: data.hostels,
    owner: { name: owner?.full_name || "Unnamed owner", phone: owner?.phone ?? null },
    documents: docs.map((d) => ({ id: d.id, type: d.doc_type, fileName: d.file_name, isPdf: d.storage_path.endsWith(".pdf"), url: urlFor.get(d.storage_path) ?? null })),
    history: history ?? [],
  };
}

// ------------------------------------------------------------------ people

export async function getUsers({ q, role, page = 1 }: { q?: string; role?: Enums<"app_role">; page?: number }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", {
    p_search: q || undefined,
    p_role: role,
    p_limit: ADMIN_PAGE_SIZE,
    p_offset: (page - 1) * ADMIN_PAGE_SIZE,
  });
  if (error) throw new Error("Could not load accounts.");
  return { rows: data ?? [], total: data?.[0]?.total ?? 0 };
}

// ------------------------------------------------------------------ plans and settings

export async function getAllPlans() {
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select("*").order("sort_order");
  return data ?? [];
}

export async function getBusinessSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("business_settings").select("*").order("key");
  return data ?? [];
}

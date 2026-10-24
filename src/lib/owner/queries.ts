import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mediaUrl } from "@/lib/hostels/queries";
import type { Enums, Tables } from "@/lib/supabase/database.types";

// Owner reads go through the signed-in client, so row-level security limits
// them to the owner's own hostels. They are never cached across users.

export type OwnerHostelSummary = Pick<
  Tables<"hostels">,
  "id" | "slug" | "name" | "status" | "is_verified" | "updated_at" | "rooms_available" | "price_from" | "moderation_note" | "rating_avg" | "rating_count"
> & { photoCount: number; roomCount: number };

export async function getOwnerHostels(ownerId: string): Promise<OwnerHostelSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hostels")
    .select("id, slug, name, status, is_verified, updated_at, rooms_available, price_from, moderation_note, rating_avg, rating_count, hostel_media(count), room_types(count)")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map(({ hostel_media, room_types, ...h }) => ({
    ...h,
    photoCount: (hostel_media as unknown as { count: number }[])[0]?.count ?? 0,
    roomCount: (room_types as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export type OwnerPhoto = { id: string; url: string; alt: string; caption: string | null; sortOrder: number; storagePath: string | null };
export type OwnerRoom = Tables<"room_types">;
export type OwnerVerification = {
  id: string;
  status: Enums<"verification_status">;
  ownerNote: string;
  reviewerNote: string | null;
  submittedAt: string;
  documents: { id: string; fileName: string; docType: string }[];
};

export type OwnerHostel = Tables<"hostels"> & {
  rooms: OwnerRoom[];
  photos: OwnerPhoto[];
  verification: OwnerVerification | null;
};

export async function getOwnerHostel(ownerId: string, id: string): Promise<OwnerHostel | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("hostels")
    .select(
      "*, room_types(*), hostel_media(id, storage_path, external_url, alt_text, caption, sort_order), " +
        "verification_applications(id, status, owner_note, reviewer_note, submitted_at, verification_documents(id, file_name, doc_type))",
    )
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Tables<"hostels"> & {
    room_types: OwnerRoom[];
    hostel_media: { id: string; storage_path: string | null; external_url: string | null; alt_text: string; caption: string | null; sort_order: number }[];
    verification_applications: {
      id: string; status: Enums<"verification_status">; owner_note: string; reviewer_note: string | null; submitted_at: string;
      verification_documents: { id: string; file_name: string; doc_type: string }[];
    }[];
  };
  const { room_types, hostel_media, verification_applications, ...hostel } = row;
  const latest = [...verification_applications].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0];
  return {
    ...hostel,
    rooms: [...room_types].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)),
    photos: [...hostel_media]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({ id: m.id, url: mediaUrl(m), alt: m.alt_text, caption: m.caption, sortOrder: m.sort_order, storagePath: m.storage_path })),
    verification: latest
      ? {
          id: latest.id,
          status: latest.status,
          ownerNote: latest.owner_note,
          reviewerNote: latest.reviewer_note,
          submittedAt: latest.submitted_at,
          documents: latest.verification_documents.map((d) => ({ id: d.id, fileName: d.file_name, docType: d.doc_type })),
        }
      : null,
  };
}

/** The owner's current plan limits, from an active subscription or the default plan. */
export async function getOwnerPlan(ownerId: string) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_name, listing_limit, plans(photo_limit, name)")
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .or(`current_period_end.is.null,current_period_end.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sub) {
    const plan = sub.plans as unknown as { photo_limit: number; name: string } | null;
    return { name: sub.plan_name, listingLimit: sub.listing_limit, photoLimit: plan?.photo_limit ?? 8 };
  }
  const { data: fallback } = await supabase.from("plans").select("name, listing_limit, photo_limit").eq("is_default", true).maybeSingle();
  return { name: fallback?.name ?? "Starter", listingLimit: fallback?.listing_limit ?? 1, photoLimit: fallback?.photo_limit ?? 8 };
}

export type OwnerInspection = {
  id: string;
  status: Enums<"inspection_status">;
  preferredDate: string;
  preferredTime: string;
  proposedDate: string | null;
  message: string;
  ownerResponse: string | null;
  createdAt: string;
  hostelName: string;
  roomName: string | null;
  student: { name: string; phone: string | null } | null;
};

export async function getOwnerInspections(ownerId: string, limit = 50): Promise<OwnerInspection[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inspection_requests")
    .select("id, status, preferred_date, preferred_time, proposed_date, message, owner_response, created_at, hostels!inner(name, owner_id), room_types(name), profiles(full_name, phone)")
    .eq("hostels.owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    preferredDate: r.preferred_date,
    preferredTime: r.preferred_time,
    proposedDate: r.proposed_date,
    message: r.message,
    ownerResponse: r.owner_response,
    createdAt: r.created_at,
    hostelName: r.hostels.name,
    roomName: r.room_types?.name ?? null,
    student: r.profiles ? { name: r.profiles.full_name, phone: r.profiles.phone } : null,
  }));
}

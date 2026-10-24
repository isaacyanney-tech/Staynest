import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { HOSTELS_TAG } from "./queries";

export const RATINGS_TAG = "ratings";

export type PublicRating = {
  id: string;
  stars: number;
  comment: string;
  reviewer: string;
  createdAt: string;
};

export type RecentRating = PublicRating & { hostel: { slug: string; name: string } };

type RatingRow = { id: string; stars: number; comment: string; reviewer_name: string; created_at: string };

const toRating = (r: RatingRow): PublicRating => ({
  id: r.id,
  stars: r.stars,
  comment: r.comment,
  reviewer: r.reviewer_name,
  createdAt: r.created_at,
});

/** Visible ratings for one hostel, newest first, with how many of each star value. */
export async function getHostelRatings(hostelId: string, limit = 20): Promise<{ items: PublicRating[]; breakdown: number[] }> {
  "use cache";
  cacheTag(RATINGS_TAG, HOSTELS_TAG, `ratings:${hostelId}`);
  cacheLife("minutes");
  const supabase = createPublicClient();
  const [list, all] = await Promise.all([
    supabase
      .from("hostel_ratings")
      .select("id, stars, comment, reviewer_name, created_at")
      .eq("hostel_id", hostelId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("hostel_ratings").select("stars").eq("hostel_id", hostelId),
  ]);
  const breakdown = [0, 0, 0, 0, 0];
  for (const r of all.data ?? []) breakdown[r.stars - 1] += 1;
  return { items: (list.data ?? []).map(toRating), breakdown };
}

/** Newest visible ratings that have a comment, for the homepage. */
export async function getRecentRatings(limit: number): Promise<RecentRating[]> {
  "use cache";
  cacheTag(RATINGS_TAG, HOSTELS_TAG);
  cacheLife("minutes");
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("hostel_ratings")
    .select("id, stars, comment, reviewer_name, created_at, hostels!inner(slug, name, status)")
    .neq("comment", "")
    .eq("hostels.status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({ ...toRating(r), hostel: { slug: r.hostels.slug, name: r.hostels.name } }));
}

export type MyRating = { stars: number; comment: string; hidden: boolean } | null;

/** Whether the signed-in student may rate this hostel, and their current rating. Not cached: it is per person. */
export async function getRatingEligibility(hostelId: string, studentId: string): Promise<{ canRate: boolean; mine: MyRating }> {
  const supabase = await createClient();
  const [{ data: canRate }, { data: mine }] = await Promise.all([
    supabase.rpc("can_rate_hostel", { p_hostel: hostelId }),
    supabase.from("hostel_ratings").select("stars, comment, is_hidden").eq("hostel_id", hostelId).eq("student_id", studentId).maybeSingle(),
  ]);
  return {
    canRate: Boolean(canRate),
    mine: mine ? { stars: mine.stars, comment: mine.comment, hidden: mine.is_hidden } : null,
  };
}

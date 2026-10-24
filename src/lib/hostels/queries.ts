import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { publicStorageUrl } from "@/lib/cms/queries";
import type { Enums } from "@/lib/supabase/database.types";
import { sanitizeTerm, type HostelSearch } from "./search-params";

export const HOSTELS_TAG = "hostels";
export const PAGE_SIZE = 12;

export type Photo = { url: string; alt: string; caption: string | null; credit: string | null };

export type HostelCard = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  area: string;
  city: string;
  distanceKm: number | null;
  gender: Enums<"gender_policy">;
  amenities: string[];
  priceFrom: number | null;
  pricePeriod: Enums<"price_period"> | null;
  roomsAvailable: number;
  verified: boolean;
  demo: boolean;
  /** Average of visible ratings, or null before anyone has rated. */
  rating: { average: number; count: number } | null;
  university: { slug: string; shortName: string; name: string } | null;
  cover: Photo | null;
};

type MediaRow = { external_url: string | null; storage_path: string | null; alt_text: string; caption: string | null; credit: string | null; sort_order: number };

export function mediaUrl(m: { external_url: string | null; storage_path: string | null }): string {
  return m.external_url ?? publicStorageUrl("public-media", m.storage_path!);
}

function toPhoto(m: MediaRow): Photo {
  return { url: mediaUrl(m), alt: m.alt_text, caption: m.caption, credit: m.credit };
}

const CARD_SELECT =
  "id, slug, name, summary, area, city, distance_km, gender_policy, amenities, price_from, rooms_available, is_verified, is_demo, published_at, rating_avg, rating_count, " +
  "universities(slug, short_name, name), hostel_media(external_url, storage_path, alt_text, caption, credit, sort_order), room_types(price_amount, price_period, occupancy)";

type CardRow = {
  id: string; slug: string; name: string; summary: string; area: string; city: string;
  distance_km: number | null; gender_policy: Enums<"gender_policy">; amenities: string[];
  price_from: number | null; rooms_available: number; is_verified: boolean; is_demo: boolean;
  rating_avg: number | null; rating_count: number;
  universities: { slug: string; short_name: string; name: string } | null;
  hostel_media: MediaRow[];
  room_types: { price_amount: number; price_period: Enums<"price_period">; occupancy: number }[];
};

function toCard(r: CardRow): HostelCard {
  const media = [...(r.hostel_media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const cheapest = [...(r.room_types ?? [])].sort((a, b) => a.price_amount - b.price_amount)[0];
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    summary: r.summary,
    area: r.area,
    city: r.city,
    distanceKm: r.distance_km,
    gender: r.gender_policy,
    amenities: r.amenities,
    priceFrom: r.price_from,
    pricePeriod: cheapest?.price_period ?? null,
    roomsAvailable: r.rooms_available,
    verified: r.is_verified,
    demo: r.is_demo,
    rating: r.rating_avg != null && r.rating_count > 0 ? { average: Number(r.rating_avg), count: r.rating_count } : null,
    university: r.universities
      ? { slug: r.universities.slug, shortName: r.universities.short_name, name: r.universities.name }
      : null,
    cover: media[0] ? toPhoto(media[0]) : null,
  };
}

export async function searchHostels(filters: HostelSearch): Promise<{ items: HostelCard[]; total: number }> {
  "use cache";
  cacheTag(HOSTELS_TAG);
  cacheLife("minutes");
  const supabase = createPublicClient();

  let universityId: string | null = null;
  if (filters.university) {
    const { data } = await supabase.from("universities").select("id").eq("slug", filters.university).maybeSingle();
    if (!data) return { items: [], total: 0 };
    universityId = data.id;
  }

  const select = filters.occupancy ? CARD_SELECT.replace("room_types(", "room_types!inner(") : CARD_SELECT;
  let query = supabase.from("hostels").select(select, { count: "exact" }).eq("status", "published");

  if (universityId) query = query.eq("university_id", universityId);
  if (filters.q) {
    const term = sanitizeTerm(filters.q);
    if (term) query = query.or(`name.ilike.%${term}%,area.ilike.%${term}%,city.ilike.%${term}%,summary.ilike.%${term}%`);
  }
  if (filters.min != null) query = query.gte("price_from", filters.min);
  if (filters.max != null) query = query.lte("price_from", filters.max);
  if (filters.gender) query = query.eq("gender_policy", filters.gender);
  if (filters.amenities.length) query = query.contains("amenities", filters.amenities);
  if (filters.available) query = query.gt("rooms_available", 0);
  if (filters.verified) query = query.eq("is_verified", true);
  if (filters.occupancy) query = query.eq("room_types.occupancy", filters.occupancy);

  switch (filters.sort) {
    case "price_asc":
      query = query.order("price_from", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order("price_from", { ascending: false, nullsFirst: false });
      break;
    case "distance":
      query = query.order("distance_km", { ascending: true, nullsFirst: false });
      break;
    case "newest":
      query = query.order("published_at", { ascending: false, nullsFirst: false });
      break;
    default:
      // Real, verified listings with rooms first; illustrative samples last.
      query = query
        .order("is_demo", { ascending: true })
        .order("is_verified", { ascending: false })
        .order("rooms_available", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false });
  }

  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(`Hostel search failed: ${error.message}`);
  return { items: ((data ?? []) as unknown as CardRow[]).map(toCard), total: count ?? 0 };
}

export type HostelDetail = HostelCard & {
  description: string;
  address: string;
  houseRules: string;
  contactPhone: string | null;
  photos: Photo[];
  rooms: {
    id: string;
    name: string;
    occupancy: number;
    price: number;
    period: Enums<"price_period">;
    total: number;
    available: number;
    description: string;
  }[];
  updatedAt: string;
};

export async function getHostelBySlug(slug: string): Promise<HostelDetail | null> {
  "use cache";
  cacheTag(HOSTELS_TAG, `hostel:${slug}`);
  cacheLife("minutes");
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("hostels")
    .select(
      CARD_SELECT.replace("room_types(price_amount, price_period, occupancy)", "room_types(id, name, occupancy, price_amount, price_period, total_rooms, available_rooms, description, sort_order)") +
        ", description, address, house_rules, contact_phone, updated_at",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as CardRow & {
    description: string; address: string; house_rules: string; contact_phone: string | null; updated_at: string;
    room_types: { id: string; name: string; occupancy: number; price_amount: number; price_period: Enums<"price_period">; total_rooms: number; available_rooms: number; description: string; sort_order: number }[];
  };
  const card = toCard(row);
  return {
    ...card,
    description: row.description,
    address: row.address,
    houseRules: row.house_rules,
    contactPhone: row.contact_phone,
    updatedAt: row.updated_at,
    photos: [...row.hostel_media].sort((a, b) => a.sort_order - b.sort_order).map(toPhoto),
    rooms: [...row.room_types]
      .sort((a, b) => a.sort_order - b.sort_order || a.price_amount - b.price_amount)
      .map((r) => ({
        id: r.id,
        name: r.name,
        occupancy: r.occupancy,
        price: r.price_amount,
        period: r.price_period,
        total: r.total_rooms,
        available: r.available_rooms,
        description: r.description,
      })),
  };
}

/** Hostels for the homepage: explicit picks, then active featured placements, then fresh listings. */
export async function getFeaturedHostels(limit: number, slugs: string[] = []): Promise<HostelCard[]> {
  "use cache";
  cacheTag(HOSTELS_TAG, "featured");
  cacheLife("minutes");
  const supabase = createPublicClient();
  const picked: HostelCard[] = [];
  const seen = new Set<string>();
  const add = (rows: CardRow[] | null) => {
    for (const r of rows ?? []) {
      if (picked.length >= limit || seen.has(r.id)) continue;
      seen.add(r.id);
      picked.push(toCard(r));
    }
  };

  if (slugs.length) {
    const { data } = await supabase.from("hostels").select(CARD_SELECT).eq("status", "published").in("slug", slugs);
    const rows = (data ?? []) as unknown as CardRow[];
    add(slugs.map((s) => rows.find((r) => r.slug === s)).filter(Boolean) as CardRow[]);
  }
  if (picked.length < limit) {
    const nowIso = new Date().toISOString();
    const { data: placements } = await supabase
      .from("featured_placements")
      .select("hostel_id")
      .lte("starts_at", nowIso)
      .gt("ends_at", nowIso);
    const ids = [...new Set((placements ?? []).map((p) => p.hostel_id))];
    if (ids.length) {
      const { data } = await supabase.from("hostels").select(CARD_SELECT).eq("status", "published").in("id", ids);
      add((data ?? []) as unknown as CardRow[]);
    }
  }
  if (picked.length < limit) {
    const { data } = await supabase
      .from("hostels")
      .select(CARD_SELECT)
      .eq("status", "published")
      .gt("rooms_available", 0)
      .order("is_demo", { ascending: true })
      .order("is_verified", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit * 2);
    add((data ?? []) as unknown as CardRow[]);
  }
  return picked;
}

export type University = {
  id: string; slug: string; name: string; shortName: string; city: string; region: string | null;
  description: string; isPopular: boolean; hostelCount: number;
};

export async function getUniversities(): Promise<University[]> {
  "use cache";
  cacheTag(HOSTELS_TAG, "universities");
  cacheLife("minutes");
  const supabase = createPublicClient();
  const [{ data: unis }, { data: counts }] = await Promise.all([
    supabase.from("universities").select("id, slug, name, short_name, city, region, description, is_popular, sort_order").order("sort_order"),
    supabase.from("hostels").select("university_id").eq("status", "published"),
  ]);
  const tally = new Map<string, number>();
  for (const c of counts ?? []) if (c.university_id) tally.set(c.university_id, (tally.get(c.university_id) ?? 0) + 1);
  return (unis ?? []).map((u) => ({
    id: u.id,
    slug: u.slug,
    name: u.name,
    shortName: u.short_name,
    city: u.city,
    region: u.region,
    description: u.description,
    isPopular: u.is_popular,
    hostelCount: tally.get(u.id) ?? 0,
  }));
}

/** Published, non-sample hostels for the sitemap. */
export async function getSitemapHostels(): Promise<{ slug: string; updatedAt: string }[]> {
  "use cache";
  cacheTag(HOSTELS_TAG, "sitemap");
  cacheLife("hours");
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("hostels")
    .select("slug, updated_at")
    .eq("status", "published")
    .eq("is_demo", false)
    .order("updated_at", { ascending: false })
    .limit(5000);
  return (data ?? []).map((h) => ({ slug: h.slug, updatedAt: h.updated_at }));
}

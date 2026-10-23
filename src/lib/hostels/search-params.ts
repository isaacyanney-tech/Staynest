import { z } from "zod";
import { AMENITIES } from "@/lib/format";

// Parses /hostels query strings into a validated filter object. Unknown or
// malformed values are dropped rather than causing errors.
export const SORTS = {
  recommended: "Recommended",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  distance: "Closest to campus",
  newest: "Newest",
} as const;

export type SortKey = keyof typeof SORTS;

const num = z.coerce.number().int().min(0).max(1_000_000);

export const searchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  university: z.string().regex(/^[a-z0-9-]{2,80}$/).optional().catch(undefined),
  min: num.optional().catch(undefined),
  max: num.optional().catch(undefined),
  occupancy: z.coerce.number().int().min(1).max(12).optional().catch(undefined),
  gender: z.enum(["mixed", "male", "female"]).optional().catch(undefined),
  amenities: z.array(z.string()).max(12).catch([]),
  available: z.boolean().catch(false),
  verified: z.boolean().catch(false),
  sort: z.enum(Object.keys(SORTS) as [SortKey, ...SortKey[]]).catch("recommended"),
  page: z.coerce.number().int().min(1).max(100).catch(1),
});

export type HostelSearch = z.infer<typeof searchSchema>;

type Raw = Record<string, string | string[] | undefined>;

export function parseSearchParams(raw: Raw): HostelSearch {
  const first = (k: string) => {
    const v = raw[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const list = (k: string) => {
    const v = raw[k];
    const arr = Array.isArray(v) ? v : v ? v.split(",") : [];
    return arr.filter((a) => a in AMENITIES);
  };
  const parsed = searchSchema.parse({
    q: first("q") || undefined,
    university: first("university") || undefined,
    min: first("min") || undefined,
    max: first("max") || undefined,
    occupancy: first("occupancy") || undefined,
    gender: first("gender") || undefined,
    amenities: list("amenities"),
    available: first("available") === "1",
    verified: first("verified") === "1",
    sort: first("sort") ?? "recommended",
    page: first("page") ?? 1,
  });
  if (parsed.min != null && parsed.max != null && parsed.min > parsed.max) {
    [parsed.min, parsed.max] = [parsed.max, parsed.min];
  }
  return parsed;
}

/** Serialises filters back to a query string, omitting defaults. */
export function toQueryString(s: Partial<HostelSearch>): string {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.university) p.set("university", s.university);
  if (s.min != null) p.set("min", String(s.min));
  if (s.max != null) p.set("max", String(s.max));
  if (s.occupancy) p.set("occupancy", String(s.occupancy));
  if (s.gender) p.set("gender", s.gender);
  if (s.amenities?.length) p.set("amenities", s.amenities.join(","));
  if (s.available) p.set("available", "1");
  if (s.verified) p.set("verified", "1");
  if (s.sort && s.sort !== "recommended") p.set("sort", s.sort);
  if (s.page && s.page > 1) p.set("page", String(s.page));
  const out = p.toString();
  return out ? `?${out}` : "";
}

/** Keeps only characters that are safe inside a PostgREST or() filter. */
export function sanitizeTerm(q: string): string {
  return q.replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

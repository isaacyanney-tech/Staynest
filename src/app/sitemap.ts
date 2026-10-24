import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { getSitemapHostels, getUniversities } from "@/lib/hostels/queries";

const PAGES = ["/", "/hostels", "/universities", "/pricing", "/safety", "/faq", "/about", "/contact", "/terms", "/privacy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const [universities, hostels] = await Promise.all([getUniversities(), getSitemapHostels()]);
  return [
    ...PAGES.map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const, priority: path === "/" ? 1 : 0.6 })),
    ...universities.map((u) => ({ url: `${base}/universities/${u.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...hostels.map((h) => ({ url: `${base}/hostels/${h.slug}`, lastModified: h.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}

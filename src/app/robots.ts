import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api", "/auth", "/reset-password"] }],
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
  };
}

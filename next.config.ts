import type { NextConfig } from "next";

const supabaseUrl = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
  } catch {
    return null;
  }
})();
// Only the browser-test build points Supabase at this machine.
const localSupabase = supabaseUrl?.hostname === "127.0.0.1" || supabaseUrl?.hostname === "localhost";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Hostel photos come from Supabase Storage; illustrative sample photos are
    // hotlinked from Unsplash under the Unsplash License.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      supabaseUrl
        ? {
            protocol: supabaseUrl.protocol === "http:" ? ("http" as const) : ("https" as const),
            hostname: supabaseUrl.hostname,
            port: supabaseUrl.port,
            pathname: "/storage/v1/object/public/**",
          }
        : { protocol: "https" as const, hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
    dangerouslyAllowLocalIP: localSupabase,
  },
  experimental: {
    // Hostel photos and verification documents are uploaded through server actions.
    serverActions: { bodySizeLimit: "12mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

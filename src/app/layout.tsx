import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { getSiteSettings } from "@/lib/cms/queries";
import { publicEnv } from "@/lib/env";
import { themeToCssVars } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const seo = (settings?.seo ?? {}) as { title?: string; description?: string };
  const name = settings?.site_name ?? "StayNest";
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: seo.title || name, template: `%s | ${name}` },
    description: seo.description || settings?.tagline || undefined,
    applicationName: name,
    icons: settings?.faviconUrl ? { icon: settings.faviconUrl } : undefined,
    openGraph: { siteName: name, type: "website", locale: "en_GH" },
  };
}

export const viewport: Viewport = {
  themeColor: "#173B57",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  return (
    <html
      lang="en-GH"
      className={`${inter.variable} ${bricolage.variable} h-full antialiased`}
      style={themeToCssVars(settings?.theme) as React.CSSProperties}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

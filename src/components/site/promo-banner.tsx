import Link from "next/link";
import { getActiveBanners } from "@/lib/cms/queries";
import { cn } from "@/lib/cn";

export async function PromoBanner() {
  const banners = await getActiveBanners();
  const banner = banners[0];
  if (!banner) return null;
  const tone = {
    info: "bg-primary text-white",
    promo: "bg-secondary text-ink",
    notice: "bg-warning-soft text-warning",
  }[banner.tone as "info" | "promo" | "notice"] ?? "bg-primary text-white";
  return (
    <div className={cn("px-4 py-2 text-center text-sm", tone)}>
      <span>{banner.message}</span>
      {banner.link_href && banner.link_label && (
        <Link href={banner.link_href} className="ml-2 font-semibold underline underline-offset-2">
          {banner.link_label}
        </Link>
      )}
    </div>
  );
}

import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export const BILLING_TAG = "billing";

export type Plan = {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  listingLimit: number | null;
  featuredSlots: number;
  photoLimit: number;
  features: string[];
  isDefault: boolean;
};

/** Active plans in display order. Prices and limits are managed by administrators. */
export async function getPlans(): Promise<Plan[]> {
  "use cache";
  cacheTag(BILLING_TAG, "plans");
  cacheLife("minutes");
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("plans")
    .select("id, code, name, description, price_amount, currency, billing_interval, listing_limit, featured_slots, photo_limit, features, is_default")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    price: Number(p.price_amount),
    currency: p.currency,
    interval: p.billing_interval as Plan["interval"],
    listingLimit: p.listing_limit,
    featuredSlots: p.featured_slots,
    photoLimit: p.photo_limit,
    features: p.features,
    isDefault: p.is_default,
  }));
}

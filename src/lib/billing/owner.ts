import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus } from "./schemas";

// Owner billing reads go through the signed-in client, so row-level security
// limits them to the owner's own subscription, payments and hostels.

export type OwnerSubscription = {
  planCode: string | null;
  planName: string;
  price: number;
  currency: string;
  periodEnd: string | null;
  featuredSlots: number;
};

export type OwnerPayment = {
  reference: string;
  purpose: "subscription" | "featured_placement";
  status: PaymentStatus;
  amount: number;
  currency: string;
  createdAt: string;
  label: string;
};

export type OwnerPlacement = { hostelName: string; startsAt: string; endsAt: string; source: string };

export type OwnerBilling = {
  subscription: OwnerSubscription | null;
  slotsLeft: number;
  weekPrice: number | null;
  payments: OwnerPayment[];
  placements: OwnerPlacement[];
  publishedHostels: { id: string; name: string }[];
};

export async function getOwnerBilling(ownerId: string): Promise<OwnerBilling> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [sub, slots, price, payments, hostels] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan_name, price_amount, currency, current_period_end, featured_slots, plans(code)")
      .eq("owner_id", ownerId)
      .eq("status", "active")
      .gt("current_period_end", now)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc("my_featured_slots_left"),
    supabase.from("business_settings").select("value").eq("key", "featured.price_per_week").maybeSingle(),
    supabase
      .from("payments")
      .select("reference, purpose, status, amount, currency, created_at, featured_weeks, plans(name), hostels(name)")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase.from("hostels").select("id, name, status").eq("owner_id", ownerId).order("name"),
  ]);

  const ownHostels = hostels.data ?? [];
  const placements = ownHostels.length
    ? await supabase
        .from("featured_placements")
        .select("starts_at, ends_at, source, hostel_id")
        .in("hostel_id", ownHostels.map((h) => h.id))
        .gt("ends_at", now)
        .order("starts_at")
    : { data: [] };
  const nameOf = new Map(ownHostels.map((h) => [h.id, h.name]));

  const s = sub.data;
  const weekPrice = Number(price.data?.value);
  return {
    subscription: s
      ? {
          planCode: (s.plans as unknown as { code: string } | null)?.code ?? null,
          planName: s.plan_name,
          price: Number(s.price_amount),
          currency: s.currency,
          periodEnd: s.current_period_end,
          featuredSlots: s.featured_slots,
        }
      : null,
    slotsLeft: slots.data ?? 0,
    weekPrice: Number.isFinite(weekPrice) && weekPrice > 0 ? weekPrice : null,
    payments: (payments.data ?? []).map((p) => {
      const plan = p.plans as unknown as { name: string } | null;
      const hostel = p.hostels as unknown as { name: string } | null;
      const weeks = p.featured_weeks ?? 0;
      return {
        reference: p.reference,
        purpose: p.purpose as OwnerPayment["purpose"],
        status: p.status as PaymentStatus,
        amount: Number(p.amount),
        currency: p.currency,
        createdAt: p.created_at,
        label:
          p.purpose === "subscription"
            ? `${plan?.name ?? "Plan"} plan`
            : `Featured: ${hostel?.name ?? "hostel"}, ${weeks} week${weeks === 1 ? "" : "s"}`,
      };
    }),
    placements: (placements.data ?? []).map((f) => ({
      hostelName: nameOf.get(f.hostel_id) ?? "Hostel",
      startsAt: f.starts_at,
      endsAt: f.ends_at,
      source: f.source,
    })),
    publishedHostels: ownHostels.filter((h) => h.status === "published").map(({ id, name }) => ({ id, name })),
  };
}

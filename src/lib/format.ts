import type { Enums } from "@/lib/supabase/database.types";

const money = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  currencyDisplay: "code",
  maximumFractionDigits: 0,
});

export function formatMoney(amount: number | null | undefined, currency = "GHS"): string {
  if (amount == null) return "Price on request";
  if (currency !== "GHS") {
    return new Intl.NumberFormat("en-GH", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  }
  // "GHS 6,500" reads better than the cedi sign, which many fonts lack.
  return money.format(amount).replace(/ /g, " ");
}

export const PERIOD_LABEL: Record<Enums<"price_period">, string> = {
  academic_year: "per academic year",
  semester: "per semester",
  month: "per month",
};

export const PERIOD_SHORT: Record<Enums<"price_period">, string> = {
  academic_year: "/ year",
  semester: "/ semester",
  month: "/ month",
};

export const GENDER_LABEL: Record<Enums<"gender_policy">, string> = {
  mixed: "Mixed",
  male: "Male only",
  female: "Female only",
};

export const AMENITIES: Record<string, string> = {
  wifi: "Wi-Fi",
  water_storage: "Water storage",
  backup_power: "Backup power",
  security: "Security guard",
  cctv: "CCTV",
  study_area: "Study area",
  kitchen: "Shared kitchen",
  laundry: "Laundry",
  private_bathroom: "Private bathroom",
  air_conditioning: "Air conditioning",
  gym: "Gym",
  parking: "Parking",
};

export function amenityLabel(key: string): string {
  return AMENITIES[key] ?? key.replace(/_/g, " ");
}

export function formatDate(value: string | Date, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  const d = typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00` : value) : value;
  return new Intl.DateTimeFormat("en-GB", opts).format(d);
}

export function formatDistance(km: number | null): string | null {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m from campus`;
  return `${km.toFixed(1)} km from campus`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

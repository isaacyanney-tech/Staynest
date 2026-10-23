import type { Enums } from "@/lib/supabase/database.types";

export const LISTING_STATUS: Record<Enums<"listing_status">, { label: string; tone: "neutral" | "info" | "success" | "danger" | "warning" }> = {
  draft: { label: "Draft", tone: "neutral" },
  pending_review: { label: "In review", tone: "info" },
  published: { label: "Published", tone: "success" },
  rejected: { label: "Changes needed", tone: "danger" },
  suspended: { label: "Suspended", tone: "warning" },
};

import type { Enums } from "@/lib/supabase/database.types";

export const VERIFICATION_STATUS: Record<Enums<"verification_status">, { label: string; tone: "info" | "warning" | "success" | "danger" }> = {
  pending: { label: "To review", tone: "info" },
  needs_info: { label: "Waiting for owner", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

export const DOC_LABEL: Record<string, string> = {
  ownership: "Proof of ownership",
  identity: "Photo ID",
  business_registration: "Business registration",
  other: "Other",
};

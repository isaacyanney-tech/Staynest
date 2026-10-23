import "server-only";
import { revalidateTag } from "next/cache";
import { verifyTransaction } from "@/lib/paystack";
import { createServiceClient } from "@/lib/supabase/service";
import { HOSTELS_TAG } from "@/lib/hostels/queries";
import { BILLING_TAG } from "./queries";

export type SettleResult = "settled" | "already_settled" | "not_paid" | "mismatch" | "unknown" | "pending";

/**
 * Asks Paystack for the transaction itself, then records the result. Nothing
 * from the browser or the webhook body is trusted for the amount or status:
 * finalize_payment() compares Paystack's answer with the price stored when
 * checkout started, and grants the purchase at most once.
 */
export async function settlePayment(reference: string): Promise<SettleResult> {
  const tx = await verifyTransaction(reference);
  // Still on the checkout page, or a bank transfer that has not cleared yet.
  if (tx.status === "ongoing" || tx.status === "pending" || tx.status === "processing" || tx.status === "queued") return "pending";

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("finalize_payment", {
    p_reference: reference,
    p_status: tx.status,
    p_amount_minor: tx.amountMinor,
    p_currency: tx.currency,
    p_gateway_response: tx.gatewayResponse,
    p_payload: tx.summary,
  });
  if (error) throw new Error(`Could not record payment ${reference}: ${error.message}`);
  const result = data as SettleResult;
  // Called from route handlers and server actions. Featured hostels and the
  // owner's plan must show at once, so cached copies are dropped, not refreshed.
  if (result === "settled") {
    revalidateTag(BILLING_TAG, { expire: 0 });
    revalidateTag(HOSTELS_TAG, { expire: 0 });
  }
  return result;
}

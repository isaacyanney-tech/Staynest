import { z } from "zod";

export const planCheckoutSchema = z.object({
  plan: z.string().regex(/^[a-z0-9_-]{1,40}$/, "Choose a plan."),
});

export const featuredCheckoutSchema = z.object({
  hostelId: z.uuid("Choose one of your published hostels."),
  weeks: z.coerce
    .number("Enter a number of weeks.")
    .int("Use a whole number of weeks.")
    .min(1, "Feature it for at least one week.")
    .max(12, "You can buy up to 12 weeks at a time."),
});

export const includedWeekSchema = z.object({
  hostelId: z.uuid("Choose one of your published hostels."),
});

export const paymentReferenceSchema = z.string().regex(/^[A-Za-z0-9_-]{6,100}$/, "That payment reference is not valid.");

export const PAYMENT_STATUSES = ["pending", "success", "failed", "abandoned"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** What the owner sees after returning from Paystack. */
export const RETURN_MESSAGES = {
  settled: { tone: "success", text: "Payment received. Your purchase is active now." },
  already_settled: { tone: "success", text: "Payment received. Your purchase is active." },
  pending: { tone: "info", text: "Paystack has not confirmed this payment yet. It will apply as soon as it clears, and this page will show it." },
  not_paid: { tone: "danger", text: "The payment did not go through, and you were not charged. You can try again." },
  mismatch: { tone: "danger", text: "The amount paid did not match the price, so nothing was applied. Contact us with the reference below and we will sort it out." },
  unknown: { tone: "danger", text: "We could not find that payment. If money left your account, contact us with the reference." },
  error: { tone: "danger", text: "We could not confirm the payment with Paystack just now. If you paid, it will apply once Paystack confirms it." },
} as const;
export type ReturnOutcome = keyof typeof RETURN_MESSAGES;

/** What an administrator sees after asking Paystack about a payment again. */
export const RECHECK_MESSAGES = {
  settled: { tone: "success", text: "Paystack confirmed it. The purchase is now active." },
  already_settled: { tone: "success", text: "This payment was already recorded as paid." },
  pending: { tone: "info", text: "Paystack still has it as unfinished." },
  not_paid: { tone: "warning", text: "Paystack says it was not paid. It is now marked as failed or cancelled." },
  mismatch: { tone: "danger", text: "The amount paid did not match the price. It is marked as failed and logged." },
  unknown: { tone: "danger", text: "No payment with that reference." },
} as const;

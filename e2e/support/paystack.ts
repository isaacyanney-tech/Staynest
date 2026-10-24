import { createHmac } from "node:crypto";

// Shared by playwright.config.ts and the payment tests. Test-only values.
export const fakePaystack = "http://127.0.0.1:54330";
export const paystackTestSecret = "sk_test_e2e_only_not_a_real_key";

/** Signs a webhook body the way Paystack does. */
export const paystackSignature = (body: string, key = paystackTestSecret) => createHmac("sha512", key).update(body).digest("hex");

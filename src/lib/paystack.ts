import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Paystack API calls. The secret key never leaves the server: it is read here
// from the environment and used only in server actions and route handlers.
// PAYSTACK_API_URL exists so browser tests can point at a local stand-in.

const API = (process.env.PAYSTACK_API_URL ?? "https://api.paystack.co").replace(/\/$/, "");

export class PaystackError extends Error {}

function secret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaystackError("Payments are not set up yet.");
  return key;
}

export function paymentsConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Paystack counts money in the minor unit: GHS 150.00 is 15000 pesewas. */
export function toMinor(amount: number): number {
  return Math.round(amount * 100);
}

async function call<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    if (e instanceof PaystackError) throw e;
    throw new PaystackError("Could not reach Paystack. Please try again.");
  }
  const body = await res.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!res.ok || !parsed.success) throw new PaystackError("Paystack could not process the request. Please try again.");
  return parsed.data;
}

const initializeResponse = z.object({
  status: z.literal(true),
  data: z.object({ authorization_url: z.url(), reference: z.string() }),
});

export async function initializeTransaction(input: {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<string> {
  const { data } = await call(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: toMinor(input.amount),
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    },
    initializeResponse,
  );
  // Only ever send people to Paystack's own checkout.
  const url = new URL(data.authorization_url);
  if (url.protocol !== "https:" && !process.env.PAYSTACK_API_URL) throw new PaystackError("Unexpected checkout address.");
  return data.authorization_url;
}

export const verifyResponse = z.object({
  status: z.literal(true),
  data: z.object({
    id: z.number().optional(),
    reference: z.string(),
    status: z.string(),
    amount: z.number().int(),
    currency: z.string(),
    gateway_response: z.string().nullish(),
    channel: z.string().nullish(),
    paid_at: z.string().nullish(),
  }),
});

export type VerifiedTransaction = {
  reference: string;
  status: string;
  amountMinor: number;
  currency: string;
  gatewayResponse: string;
  /** What is kept on the payment row: no card, customer or authorization details. */
  summary: { id?: number; status: string; channel?: string | null; paid_at?: string | null };
};

export function toVerified(body: z.infer<typeof verifyResponse>): VerifiedTransaction {
  const d = body.data;
  return {
    reference: d.reference,
    status: d.status,
    amountMinor: d.amount,
    currency: d.currency,
    gatewayResponse: d.gateway_response ?? "",
    summary: { id: d.id, status: d.status, channel: d.channel, paid_at: d.paid_at },
  };
}

export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(reference)) throw new PaystackError("That payment reference is not valid.");
  return toVerified(await call(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" }, verifyResponse));
}

/** Paystack signs each webhook body with HMAC-SHA512 of the secret key. */
export function isValidSignature(rawBody: string, signature: string | null, key = process.env.PAYSTACK_SECRET_KEY ?? ""): boolean {
  if (!key || !signature || !/^[0-9a-f]{128}$/i.test(signature)) return false;
  const expected = Buffer.from(createHmac("sha512", key).update(rawBody).digest("hex"), "hex");
  const given = Buffer.from(signature, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

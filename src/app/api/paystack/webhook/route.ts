import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { settlePayment } from "@/lib/billing/settle";
import { paymentReferenceSchema } from "@/lib/billing/schemas";
import { isValidSignature } from "@/lib/paystack";
import { logError } from "@/lib/log";

// Paystack calls this for every transaction event. The body must carry a
// valid HMAC signature, and even then only its reference is used: the
// transaction is fetched again from Paystack's API before anything is granted.
// settlePayment() is idempotent, so retries and the browser callback racing
// this webhook cannot grant a purchase twice.

const MAX_BODY = 64 * 1024;
const event = z.object({ event: z.string(), data: z.object({ reference: z.string() }).loose() }).loose();

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return new NextResponse(null, { status: 413 });
  if (!isValidSignature(raw, request.headers.get("x-paystack-signature"))) {
    return new NextResponse(null, { status: 401 });
  }

  let body: z.infer<typeof event>;
  try {
    body = event.parse(JSON.parse(raw));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  // Other events (transfers, refunds, disputes) are acknowledged and ignored.
  if (body.event !== "charge.success") return NextResponse.json({ received: true });

  const reference = paymentReferenceSchema.safeParse(body.data.reference);
  if (!reference.success) return NextResponse.json({ received: true });
  try {
    const result = await settlePayment(reference.data);
    return NextResponse.json({ received: true, result });
  } catch (e) {
    // A non-2xx answer makes Paystack retry later.
    logError("paystack_webhook_settle_failed", e, { reference: reference.data });
    return new NextResponse(null, { status: 503 });
  }
}

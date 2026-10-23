import { NextResponse, type NextRequest } from "next/server";
import { settlePayment } from "@/lib/billing/settle";
import { paymentReferenceSchema, type ReturnOutcome } from "@/lib/billing/schemas";
import { PaystackError } from "@/lib/paystack";

// Paystack sends the owner here after checkout with ?reference=. The result is
// read from Paystack's API, never from the query string, so visiting this
// address by hand can at most confirm a payment that really happened.

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("reference") ?? request.nextUrl.searchParams.get("trxref") ?? "";
  const reference = paymentReferenceSchema.safeParse(raw);
  if (!reference.success) return back({ payment: "unknown" });

  let outcome: ReturnOutcome;
  try {
    outcome = await settlePayment(reference.data);
  } catch (e) {
    if (!(e instanceof PaystackError)) console.error("Paystack callback failed", e);
    outcome = "error";
  }
  return back({ payment: outcome, ref: reference.data });
}

// A relative Location keeps the owner on the host they came back to, so their
// session cookie is sent even when the server sees a different internal host.
function back(params: Record<string, string>) {
  return new NextResponse(null, { status: 303, headers: { Location: `/dashboard/owner/billing?${new URLSearchParams(params)}` } });
}

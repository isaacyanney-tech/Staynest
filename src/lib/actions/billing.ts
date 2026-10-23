"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { authorize, AuthorizationError, type Viewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HOSTELS_TAG } from "@/lib/hostels/queries";
import { BILLING_TAG } from "@/lib/billing/queries";
import { featuredCheckoutSchema, includedWeekSchema, paymentReferenceSchema, planCheckoutSchema } from "@/lib/billing/schemas";
import { settlePayment, type SettleResult } from "@/lib/billing/settle";
import { initializeTransaction, paymentsConfigured, PaystackError } from "@/lib/paystack";
import { formatDate } from "@/lib/format";
import { formValues, fromZodError, friendlyDbError, type FormState } from "@/lib/forms";

// Prices are never taken from the form: start_payment() reads them from the
// plans table and business settings, and records the pending payment that
// Paystack's answer is later checked against.

const deniedOwner: FormState = { status: "error", message: "Sign in with an owner account to do that." };
const notReady: FormState = { status: "error", message: "Online payments are not switched on yet. Please try again later." };

async function as(role: "owner" | "admin"): Promise<Viewer | null> {
  try {
    return await authorize([role]);
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }
}

/** Where Paystack sends the owner back to. The configured site address wins over request headers. */
async function callbackUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL;
  if (configured) return `${configured.replace(/\/$/, "")}/dashboard/owner/billing/callback`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/dashboard/owner/billing/callback`;
}

async function checkout(
  viewer: Viewer,
  formData: FormData,
  args: { p_purpose: string; p_plan_code?: string; p_hostel?: string; p_weeks?: number },
): Promise<FormState> {
  if (!viewer.email) return { status: "error", message: "Add an email address to your account before paying. Paystack sends the receipt there." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_payment", args);
  const payment = data?.[0];
  if (error || !payment) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };

  let url: string;
  try {
    url = await initializeTransaction({
      email: viewer.email,
      amount: Number(payment.amount),
      currency: payment.currency,
      reference: payment.reference,
      callbackUrl: await callbackUrl(),
      metadata: { purpose: args.p_purpose, description: payment.description },
    });
  } catch (e) {
    if (e instanceof PaystackError) return { status: "error", message: e.message, values: formValues(formData) };
    throw e;
  }
  redirect(url);
}

export async function startPlanCheckout(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await as("owner");
  if (!viewer) return deniedOwner;
  if (!paymentsConfigured()) return notReady;
  const parsed = planCheckoutSchema.safeParse({ plan: formData.get("plan") });
  if (!parsed.success) return fromZodError(parsed.error, formData, "Choose a plan.");
  return checkout(viewer, formData, { p_purpose: "subscription", p_plan_code: parsed.data.plan });
}

export async function startFeaturedCheckout(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await as("owner");
  if (!viewer) return deniedOwner;
  if (!paymentsConfigured()) return notReady;
  const parsed = featuredCheckoutSchema.safeParse({ hostelId: formData.get("hostelId"), weeks: formData.get("weeks") });
  if (!parsed.success) return fromZodError(parsed.error, formData);
  return checkout(viewer, formData, { p_purpose: "featured_placement", p_hostel: parsed.data.hostelId, p_weeks: parsed.data.weeks });
}

export async function applyIncludedWeek(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await as("owner"))) return deniedOwner;
  const parsed = includedWeekSchema.safeParse({ hostelId: formData.get("hostelId") });
  if (!parsed.success) return fromZodError(parsed.error, formData);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("use_featured_slot", { p_hostel: parsed.data.hostelId });
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  updateTag(HOSTELS_TAG);
  updateTag(BILLING_TAG);
  refresh();
  return { status: "success", message: `Featured until ${formatDate(data, { dateStyle: "long" })}.` };
}

/** Admins can ask Paystack again about a payment that is still pending. */
export async function recheckPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await as("admin"))) return { status: "error", message: "Sign in with an administrator account to do that." };
  if (!paymentsConfigured()) return notReady;
  const reference = paymentReferenceSchema.safeParse(formData.get("reference"));
  if (!reference.success) return { status: "error", message: "That payment reference is not valid." };
  let result: SettleResult;
  try {
    result = await settlePayment(reference.data);
  } catch (e) {
    if (e instanceof PaystackError) return { status: "error", message: e.message };
    throw e;
  }
  // The row may leave the filtered list, so the answer is shown on the page.
  redirect(`/admin/payments?${new URLSearchParams({ checked: reference.data, result })}`);
}

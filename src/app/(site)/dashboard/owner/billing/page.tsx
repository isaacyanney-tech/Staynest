import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getPlans } from "@/lib/billing/queries";
import { getOwnerBilling } from "@/lib/billing/owner";
import { RETURN_MESSAGES, type ReturnOutcome } from "@/lib/billing/schemas";
import { paymentsConfigured } from "@/lib/paystack";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/states";
import { DashboardHeader, DashboardSkeleton } from "@/components/dashboard/shell";
import { BuyFeaturedForm, IncludedWeekForm, PlanCheckoutButton } from "@/components/billing/billing-forms";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Plan and billing", robots: { index: false } };

export default function OwnerBillingPage({ searchParams }: PageProps<"/dashboard/owner/billing">) {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <Billing searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const PAYMENT_STATUS = {
  success: { label: "Paid", tone: "success" },
  pending: { label: "Not finished", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
  abandoned: { label: "Cancelled", tone: "neutral" },
} as const;

async function Billing({ searchParams }: { searchParams: PageProps<"/dashboard/owner/billing">["searchParams"] }) {
  const viewer = await requireRole(["owner"]);
  const [billing, plans, params] = await Promise.all([getOwnerBilling(viewer.id), getPlans(), searchParams]);
  const outcome = typeof params.payment === "string" && params.payment in RETURN_MESSAGES ? (params.payment as ReturnOutcome) : null;
  const ref = typeof params.ref === "string" && /^[A-Za-z0-9_-]{6,100}$/.test(params.ref) ? params.ref : null;
  const canPay = paymentsConfigured();
  const sub = billing.subscription;
  const current = sub?.planCode ?? plans.find((p) => p.isDefault)?.code;

  return (
    <>
      <Link href="/dashboard/owner" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> Your hostels
      </Link>
      <div className="mt-3">
        <DashboardHeader viewer={viewer} title="Plan and billing" />
      </div>

      {outcome && (
        <Notice tone={RETURN_MESSAGES[outcome].tone} className="mt-6">
          {RETURN_MESSAGES[outcome].text}
          {ref && <span className="mt-1 block text-sm">Reference: <code className="font-mono">{ref}</code></span>}
        </Notice>
      )}
      {!canPay && (
        <Notice tone="warning" className="mt-6">
          Online payments are not switched on yet. You can still see your plan and history here.
        </Notice>
      )}

      <section aria-labelledby="plan-heading" className="mt-8">
        <h2 id="plan-heading" className="text-xl font-semibold">
          Your plan
        </h2>
        <p className="mt-2 text-muted">
          {sub ? (
            <>
              <strong className="text-ink">{sub.planName}</strong>, paid until{" "}
              <strong className="text-ink">{sub.periodEnd ? formatDate(sub.periodEnd, { dateStyle: "long" }) : "further notice"}</strong>.
            </>
          ) : (
            <>
              <strong className="text-ink">{plans.find((p) => p.isDefault)?.name ?? "Starter"}</strong>, the free plan.
            </>
          )}{" "}
          Plans never renew by themselves: you pay for one period at a time, and paying again for the same plan adds another period.
        </p>
        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = p.code === current;
            const paid = p.price > 0;
            return (
              <li
                key={p.id}
                aria-labelledby={`plan-${p.code}`}
                className={cn("flex flex-col rounded-lg border bg-surface p-5", isCurrent ? "border-primary ring-1 ring-primary" : "border-line")}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 id={`plan-${p.code}`} className="text-lg font-semibold">
                    {p.name}
                  </h3>
                  {isCurrent && <Badge tone="info">Current</Badge>}
                </div>
                <p className="mt-1 text-2xl font-semibold tracking-tight">
                  {paid ? formatMoney(p.price, p.currency) : "Free"}
                  {paid && <span className="text-sm font-normal text-muted"> / {p.interval}</span>}
                </p>
                <ul className="mt-3 flex-1 space-y-1 text-sm text-muted">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <div className="mt-5">
                  {!paid ? (
                    <p className="text-sm text-muted">{isCurrent ? "You are on this plan." : "Applies when a paid plan ends."}</p>
                  ) : canPay ? (
                    <PlanCheckoutButton
                      plan={p.code}
                      variant={isCurrent ? "outline" : "primary"}
                      label={isCurrent ? `Add another ${p.interval}` : `Switch to ${p.name}`}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        {sub && (
          <p className="mt-3 text-sm text-muted">
            Switching to a different plan starts it today. Unused time on your current plan is not carried over.
          </p>
        )}
      </section>

      <section aria-labelledby="featured-heading" className="mt-12">
        <h2 id="featured-heading" className="flex items-center gap-2 text-xl font-semibold">
          <Sparkles className="size-5 text-secondary-ink" aria-hidden />
          Featured placements
        </h2>
        <p className="mt-2 text-muted">A featured hostel is among the first picked for the homepage while its featured time lasts. Only published listings can be featured.</p>

        {billing.publishedHostels.length === 0 ? (
          <p className="mt-4 rounded-lg border border-line bg-surface p-5 text-sm text-muted">
            Once one of your listings is published, you can feature it here.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {(sub?.featuredSlots ?? 0) > 0 && (
              <div className="rounded-lg border border-line bg-surface p-5">
                <IncludedWeekForm hostels={billing.publishedHostels} left={billing.slotsLeft} />
              </div>
            )}
            {canPay && billing.weekPrice !== null && (
              <div className="rounded-lg border border-line bg-surface p-5">
                <BuyFeaturedForm hostels={billing.publishedHostels} weekPrice={billing.weekPrice} />
              </div>
            )}
          </div>
        )}

        {billing.placements.length > 0 && (
          <>
            <h3 className="mt-6 font-semibold">Current and upcoming</h3>
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface">
              {billing.placements.map((f, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span className="font-medium">{f.hostelName}</span>
                  <span className="text-muted">
                    {formatDate(f.startsAt)} to {formatDate(f.endsAt)} · {f.source === "paid" ? "paid" : f.source === "subscription" ? "included in plan" : "added by StayNest"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="history-heading" className="mt-12">
        <h2 id="history-heading" className="text-xl font-semibold">
          Payment history
        </h2>
        {billing.payments.length === 0 ? (
          <p className="mt-3 text-muted">No payments yet.</p>
        ) : (
          // Focusable so keyboard users can scroll the table sideways on small screens.
          <div tabIndex={0} role="region" aria-labelledby="history-heading" className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">For</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Amount</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {billing.payments.map((p) => (
                  <tr key={p.reference}>
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-2.5">{p.label}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{formatMoney(p.amount, p.currency)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={PAYMENT_STATUS[p.status].tone}>{PAYMENT_STATUS[p.status].label}</Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted">{p.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

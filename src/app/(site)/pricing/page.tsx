import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getPlans } from "@/lib/billing/queries";
import { getPublicSetting } from "@/lib/cms/queries";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = {
  title: "Plans for hostel owners",
  description: "List your hostel on StayNest. Start free and upgrade when you manage more properties.",
};

export default async function PricingPage() {
  const [plans, featuredPrice] = await Promise.all([getPlans(), getPublicSetting<number>("featured.price_per_week", 0)]);
  // Highlight the middle paid plan, the usual fit for owners with a few properties.
  const highlighted = plans.length >= 3 ? plans[Math.floor(plans.length / 2)]?.id : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 md:pt-14">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-secondary-ink">For hostel owners</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-primary md:text-[2.75rem] md:leading-tight">Plans that grow with your hostels</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Students search for free. Owners start on the free plan and upgrade when they list more properties. StayNest never takes a cut of rent.
        </p>
      </div>

      {plans.length === 0 ? (
        <EmptyState className="mt-10" title="Plans are being updated">
          Check back shortly, or contact us for details.
        </EmptyState>
      ) : (
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const isHighlighted = plan.id === highlighted;
            return (
              <li
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-xl border bg-surface p-6",
                  isHighlighted ? "border-primary shadow-overlay" : "border-line",
                )}
              >
                {isHighlighted && (
                  <span className="absolute -top-3 left-6 rounded-sm bg-primary px-2 py-1 text-xs font-medium text-white">Most chosen</span>
                )}
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <p className="mt-1 min-h-10 text-sm text-muted">{plan.description}</p>
                <p className="mt-5">
                  <span className="font-display text-4xl font-semibold tracking-tight text-primary">
                    {plan.price === 0 ? "Free" : formatMoney(plan.price, plan.currency)}
                  </span>
                  {plan.price > 0 && <span className="text-sm text-muted"> / {plan.interval}</span>}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 border-t border-line pt-5 text-[0.9375rem]">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-secondary-ink" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <LinkButton
                  href={plan.price === 0 ? "/sign-up?role=owner" : `/sign-up?role=owner&plan=${plan.code}`}
                  variant={isHighlighted ? "primary" : "outline"}
                  className="mt-7 w-full"
                >
                  {plan.price === 0 ? "Start free" : `Choose ${plan.name}`}
                </LinkButton>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-12 grid gap-6 rounded-xl border border-line bg-surface p-6 md:grid-cols-2 md:p-8">
        <div>
          <h2 className="text-xl font-semibold">Featured placement</h2>
          <p className="mt-2 text-muted">
            Put a published listing on the homepage and at the top of search
            {featuredPrice > 0 ? <> for {formatMoney(featuredPrice)} a week.</> : "."}
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Verification is free</h2>
          <p className="mt-2 text-muted">
            Send proof of ownership and we check it before adding the Verified badge. Verified listings rank higher in search.
          </p>
        </div>
      </div>
      <p className="mt-6 text-sm text-muted">Prices are in Ghana cedis. Paid plans are billed monthly through Paystack.</p>
    </div>
  );
}

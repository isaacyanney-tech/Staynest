"use client";
import { useActionState, useState } from "react";
import { applyIncludedWeek, recheckPayment, startFeaturedCheckout, startPlanCheckout } from "@/lib/actions/billing";
import { idle } from "@/lib/forms";
import { formatMoney } from "@/lib/format";
import { Field, Input, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function PlanCheckoutButton({ plan, label, variant = "primary" }: { plan: string; label: string; variant?: "primary" | "outline" }) {
  const [state, action] = useActionState(startPlanCheckout, idle);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="plan" value={plan} />
      <SubmitButton variant={variant} className="w-full" pendingLabel="Opening Paystack…">
        {label}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

type Hostel = { id: string; name: string };

export function BuyFeaturedForm({ hostels, weekPrice }: { hostels: Hostel[]; weekPrice: number }) {
  const [state, action] = useActionState(startFeaturedCheckout, idle);
  const sent = state.status === "error" ? state.values : undefined;
  const err = state.fieldErrors ?? {};
  const [weeks, setWeeks] = useState(sent?.weeks ?? "1");
  const n = Number(weeks);
  const total = Number.isInteger(n) && n >= 1 && n <= 12 ? formatMoney(weekPrice * n) : null;

  return (
    <form action={action} className="space-y-4" noValidate aria-labelledby="buy-featured-heading">
      <h3 id="buy-featured-heading" className="font-semibold">
        Buy featured weeks
      </h3>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Hostel" name="hostelId" idPrefix="buy-" error={err.hostelId}>
          {(p) => (
            <Select {...p} name="hostelId" defaultValue={sent?.hostelId ?? hostels[0]?.id}>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Weeks" name="weeks" idPrefix="buy-" error={err.weeks}>
          {(p) => (
            <Input {...p} name="weeks" type="number" inputMode="numeric" min={1} max={12} step={1} defaultValue={weeks} onChange={(e) => setWeeks(e.target.value)} />
          )}
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {formatMoney(weekPrice)} a week{total && <> · total <strong className="text-ink">{total}</strong></>}
        </p>
        <SubmitButton pendingLabel="Opening Paystack…">Pay with Paystack</SubmitButton>
      </div>
    </form>
  );
}

export function IncludedWeekForm({ hostels, left }: { hostels: Hostel[]; left: number }) {
  const [state, action] = useActionState(applyIncludedWeek, idle);
  const sent = state.status === "error" ? state.values : undefined;
  return (
    <form action={action} className="space-y-3" noValidate aria-labelledby="included-heading">
      <h3 id="included-heading" className="font-semibold">
        Featured weeks in your plan
      </h3>
      <p className="text-sm text-muted">
        {left > 0
          ? `You have ${left} featured week${left === 1 ? "" : "s"} left this period. A week starts now, or after any featured time the hostel already has.`
          : "You have used this period's featured weeks. More come with your next payment, or you can buy extra weeks."}
      </p>
      <FormMessage state={state} />
      {left > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Hostel" name="hostelId" idPrefix="included-" className="min-w-56 flex-1" error={state.fieldErrors?.hostelId}>
            {(p) => (
              <Select {...p} name="hostelId" defaultValue={sent?.hostelId ?? hostels[0]?.id}>
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <SubmitButton variant="outline">Feature for one week</SubmitButton>
        </div>
      )}
    </form>
  );
}

export function RecheckPaymentForm({ reference }: { reference: string }) {
  const [state, action] = useActionState(recheckPayment, idle);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="reference" value={reference} />
      <SubmitButton variant="outline" size="sm" pendingLabel="Asking Paystack…">
        Check with Paystack<span className="sr-only">: {reference}</span>
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

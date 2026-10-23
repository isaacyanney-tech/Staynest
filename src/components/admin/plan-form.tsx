"use client";
import { useActionState } from "react";
import { savePlan } from "@/lib/actions/admin";
import { idle } from "@/lib/forms";
import type { Tables } from "@/lib/supabase/database.types";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function PlanForm({ plan }: { plan: Tables<"plans"> }) {
  const [state, action] = useActionState(savePlan, idle);
  const err = state.fieldErrors ?? {};
  const v = state.status === "error" ? state.values : undefined;
  const p = `plan-${plan.code}-`;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={plan.id} />
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" idPrefix={p} error={err.name}>
          {(f) => <Input {...f} name="name" defaultValue={v?.name ?? plan.name} maxLength={60} />}
        </Field>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label={`Price (${plan.currency})`} name="price_amount" idPrefix={p} error={err.price_amount}>
            {(f) => <Input {...f} name="price_amount" inputMode="decimal" defaultValue={v?.price_amount ?? String(plan.price_amount)} />}
          </Field>
          <Field label="Every" name="billing_interval" idPrefix={p} error={err.billing_interval}>
            {(f) => (
              <Select {...f} name="billing_interval" defaultValue={v?.billing_interval ?? plan.billing_interval}>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </Select>
            )}
          </Field>
        </div>
      </div>
      <Field label="Description" name="description" idPrefix={p} optional error={err.description}>
        {(f) => <Input {...f} name="description" defaultValue={v?.description ?? plan.description} maxLength={300} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Listings allowed" name="listing_limit" idPrefix={p} hint="Leave blank for no limit." error={err.listing_limit}>
          {(f) => <Input {...f} name="listing_limit" inputMode="numeric" defaultValue={v?.listing_limit ?? (plan.listing_limit === null ? "" : String(plan.listing_limit))} />}
        </Field>
        <Field label="Photos per listing" name="photo_limit" idPrefix={p} error={err.photo_limit}>
          {(f) => <Input {...f} name="photo_limit" inputMode="numeric" defaultValue={v?.photo_limit ?? String(plan.photo_limit)} />}
        </Field>
        <Field label="Featured slots" name="featured_slots" idPrefix={p} error={err.featured_slots}>
          {(f) => <Input {...f} name="featured_slots" inputMode="numeric" defaultValue={v?.featured_slots ?? String(plan.featured_slots)} />}
        </Field>
      </div>
      <Field label="Features shown on the pricing page" name="features" idPrefix={p} hint="One per line, up to 12." error={err.features}>
        {(f) => <Textarea {...f} name="features" rows={4} defaultValue={v?.features ?? plan.features.join("\n")} />}
      </Field>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Checkbox name="is_active" defaultChecked={v ? v.is_active === "on" : plan.is_active} label="Owners can choose this plan" />
        {plan.is_default ? (
          <p className="text-[0.9375rem] text-ink/75">This is the plan new owners start on.</p>
        ) : (
          <Checkbox name="makeDefault" defaultChecked={v?.makeDefault === "on"} label="Make this the plan new owners start on" />
        )}
      </div>
      <SubmitButton pendingLabel="Saving…">Save {plan.name}</SubmitButton>
    </form>
  );
}

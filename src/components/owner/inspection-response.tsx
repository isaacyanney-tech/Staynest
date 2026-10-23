"use client";
import { useActionState, useState } from "react";
import { respondToInspection } from "@/lib/actions/owner";
import { idle } from "@/lib/forms";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

type Decision = "accepted" | "rescheduled" | "declined" | "completed";

const OPTIONS: Record<string, { value: Decision; label: string }[]> = {
  requested: [
    { value: "accepted", label: "Accept this date" },
    { value: "rescheduled", label: "Offer another date" },
    { value: "declined", label: "Decline" },
  ],
  accepted: [
    { value: "completed", label: "Inspection happened" },
    { value: "rescheduled", label: "Offer another date" },
    { value: "declined", label: "Cancel and decline" },
  ],
  rescheduled: [
    { value: "completed", label: "Inspection happened" },
    { value: "rescheduled", label: "Offer a different date" },
    { value: "declined", label: "Decline" },
  ],
};

export function InspectionResponse({ id, status, today }: { id: string; status: string; today: string }) {
  const options = OPTIONS[status] ?? [];
  const [state, action] = useActionState(respondToInspection, idle);
  const [decision, setDecision] = useState<Decision>(options[0]?.value ?? "accepted");
  const err = state.fieldErrors ?? {};
  const sent = state.status === "error" ? state.values : undefined;
  const prefix = `insp-${id}-`;

  if (options.length === 0) return null;

  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      <fieldset>
        <legend className="text-sm font-medium text-ink">Your reply</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/25"
            >
              <input
                type="radio"
                name="decision"
                value={o.value}
                checked={decision === o.value}
                onChange={() => setDecision(o.value)}
                className="accent-[var(--brand-primary)]"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      {decision === "rescheduled" && (
        <Field label="Date you can offer" name="proposedDate" idPrefix={prefix} error={err.proposedDate}>
          {(p) => <Input {...p} name="proposedDate" type="date" min={today} required defaultValue={sent?.proposedDate} className="max-w-56" />}
        </Field>
      )}
      <Field
        label="Message to the student"
        name="response"
        idPrefix={prefix}
        optional={decision !== "declined"}
        error={err.response}
        hint={decision === "accepted" ? "Say where to meet and who will show them around." : undefined}
      >
        {(p) => <Textarea {...p} name="response" rows={2} maxLength={1000} className="min-h-16" defaultValue={sent?.response} />}
      </Field>
      <SubmitButton size="sm" pendingLabel="Sending…">
        Send reply
      </SubmitButton>
    </form>
  );
}

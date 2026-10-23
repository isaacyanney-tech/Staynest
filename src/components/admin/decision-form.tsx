"use client";
import { useActionState } from "react";
import { decideVerification, moderateListing } from "@/lib/actions/admin";
import { idle } from "@/lib/forms";
import { useChoice } from "@/lib/use-choice";
import { cn } from "@/lib/cn";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

type Option = { value: string; label: string; description: string; needsNote: boolean; danger?: boolean };

const ACTIONS = { listing: moderateListing, verification: decideVerification } as const;
const ID_FIELD = { listing: "hostelId", verification: "applicationId" } as const;

/** One decision with an optional or required note to the owner. */
export function DecisionForm({ kind, id, options, noteHint }: { kind: keyof typeof ACTIONS; id: string; options: Option[]; noteHint: string }) {
  const [state, action] = useActionState(ACTIONS[kind], idle);
  const [choice, setChoice] = useChoice(state, "decision", options[0]?.value ?? "");
  const err = state.fieldErrors ?? {};
  const sent = state.status === "error" ? state.values : undefined;
  // The options change after a decision (a published listing offers other
  // actions), so fall back to the first one when the old choice is gone.
  const selected = options.find((o) => o.value === choice) ?? options[0];

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name={ID_FIELD[kind]} value={id} />
      <FormMessage state={state} />
      <fieldset>
        <legend className="text-sm font-medium">Decision</legend>
        <div className="mt-2 space-y-2">
          {options.map((o) => (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-md border border-line-strong bg-surface p-3 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/25",
                o.danger ? "has-[:checked]:border-danger has-[:checked]:bg-danger-soft" : "has-[:checked]:border-primary has-[:checked]:bg-primary-soft",
              )}
            >
              <input
                type="radio"
                name="decision"
                value={o.value}
                defaultChecked={selected?.value === o.value}
                onChange={() => setChoice(o.value)}
                className="mt-1 accent-[var(--brand-primary)]"
              />
              <span>
                <span className="block text-sm font-semibold">{o.label}</span>
                <span className="block text-sm text-ink/75">{o.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Note to the owner" name="note" idPrefix={`${kind}-`} optional={!selected?.needsNote} hint={noteHint} error={err.note}>
        {(p) => <Textarea {...p} name="note" rows={3} maxLength={1000} defaultValue={sent?.note} />}
      </Field>
      <SubmitButton variant={selected?.danger ? "danger" : "primary"} pendingLabel="Saving…">
        Confirm: {selected?.label.toLowerCase()}
      </SubmitButton>
    </form>
  );
}

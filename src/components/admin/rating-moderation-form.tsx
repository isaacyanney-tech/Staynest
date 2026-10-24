"use client";
import { useActionState } from "react";
import { moderateRating } from "@/lib/actions/admin";
import { idle } from "@/lib/forms";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

/** Hide a rating with a reason, or show a hidden one again. */
export function RatingModerationForm({ id, hidden }: { id: string; hidden: boolean }) {
  const [state, action] = useActionState(moderateRating, idle);
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="ratingId" value={id} />
      <input type="hidden" name="hide" value={hidden ? "false" : "true"} />
      <FormMessage state={state} />
      {!hidden && (
        <Field label="Reason for hiding" name="reason" idPrefix={`rating-${id}-`} error={err.reason}>
          {(p) => <Input {...p} name="reason" maxLength={300} defaultValue={state.values?.reason} />}
        </Field>
      )}
      <SubmitButton variant={hidden ? "outline" : "danger"} size="sm" pendingLabel="Saving…">
        {hidden ? "Show again" : "Hide rating"}
      </SubmitButton>
    </form>
  );
}

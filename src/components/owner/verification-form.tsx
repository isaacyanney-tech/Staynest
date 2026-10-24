"use client";
import { useActionState } from "react";
import { requestVerification } from "@/lib/actions/owner";
import { idle } from "@/lib/forms";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

/**
 * Sends ownership and identity documents. When a reviewer asked for more
 * information, every document is optional but at least one is needed.
 */
export function VerificationForm({ hostelId, answering }: { hostelId: string; answering: boolean }) {
  const [state, action] = useActionState(requestVerification, idle);
  const err = state.fieldErrors ?? {};
  const sent = state.status === "error" ? state.values : undefined;

  if (state.status === "success") return <FormMessage state={state} />;

  const docs = [
    { name: "doc_ownership", label: "Proof of ownership or management", hint: "Land title, lease, tenancy agreement or a letter from the owner.", required: !answering },
    { name: "doc_identity", label: "Photo ID", hint: "Ghana Card, passport or driver's licence of the person named on the ownership document.", required: !answering },
    { name: "doc_business_registration", label: "Business registration", hint: "If the hostel is run by a company.", required: false },
    { name: "doc_other", label: "Anything else", hint: answering ? "Whatever the reviewer asked for." : "For example a utility bill for the property.", required: false },
  ];

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="hostelId" value={hostelId} />
      <FormMessage state={state} />
      <p className="text-sm text-muted">PDF, JPEG, PNG or WebP, up to 10 MB each. Only you and StayNest reviewers can open these files.</p>
      {docs.map((d) => (
        <Field key={d.name} label={d.label} name={d.name} optional={!d.required} hint={d.hint} error={err[d.name]}>
          {(p) => (
            <Input
              {...p}
              name={d.name}
              type="file"
              accept={ACCEPT}
              required={d.required}
              className="h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-primary-soft file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand"
            />
          )}
        </Field>
      ))}
      <Field label={answering ? "Reply to the reviewer" : "Note for the reviewer"} name="note" optional error={err.note}>
        {(p) => <Textarea {...p} name="note" rows={3} maxLength={2000} defaultValue={sent?.note} />}
      </Field>
      <SubmitButton pendingLabel="Sending documents…">{answering ? "Send more documents" : "Request verification"}</SubmitButton>
    </form>
  );
}

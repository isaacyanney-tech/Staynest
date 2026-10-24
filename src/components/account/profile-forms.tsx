"use client";
import { useActionState } from "react";
import { changePassword, updateProfile } from "@/lib/actions/account";
import { idle } from "@/lib/forms";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { PasswordInput } from "@/components/auth/password-input";

export function ProfileForm({ fullName, phone, email, phoneHint }: { fullName: string; phone: string | null; email: string; phoneHint: string }) {
  const [state, action] = useActionState(updateProfile, idle);
  const err = state.fieldErrors ?? {};
  const sent = state.status === "error" ? state.values : undefined;
  return (
    <form action={action} className="space-y-4" noValidate aria-labelledby="details-heading">
      <FormMessage state={state} />
      <Field label="Full name" name="fullName" error={err.fullName}>
        {(p) => <Input {...p} name="fullName" autoComplete="name" required defaultValue={sent?.fullName ?? fullName} />}
      </Field>
      <Field label="Phone number" name="phone" optional error={err.phone} hint={phoneHint}>
        {(p) => <Input {...p} name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={sent?.phone ?? phone ?? ""} />}
      </Field>
      <Field label="Email" name="email" hint="This is the address you sign in with. Contact us to change it.">
        {(p) => <Input {...p} name="email" type="email" value={email} readOnly disabled />}
      </Field>
      <SubmitButton>Save details</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, idle);
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate aria-labelledby="password-heading">
      <FormMessage state={state} />
      <Field label="New password" name="password" idPrefix="change-" error={err.password} hint="At least 10 characters, with a letter and a number.">
        {(p) => <PasswordInput {...p} name="password" autoComplete="new-password" required minLength={10} />}
      </Field>
      <Field label="Confirm new password" name="confirm" idPrefix="change-" error={err.confirm}>
        {(p) => <PasswordInput {...p} name="confirm" autoComplete="new-password" required />}
      </Field>
      <SubmitButton variant="outline" pendingLabel="Changing…">
        Change password
      </SubmitButton>
    </form>
  );
}

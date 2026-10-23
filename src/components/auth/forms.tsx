"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { GraduationCap, KeyRound } from "lucide-react";
import { adminSignIn, requestPasswordReset, resetPassword, signIn, signUp } from "@/lib/actions/auth";
import { idle, type FormState } from "@/lib/forms";
import { cn } from "@/lib/cn";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { PasswordInput } from "./password-input";

type Action = (prev: FormState, data: FormData) => Promise<FormState>;

function SignInFields({ action, next, admin = false }: { action: Action; next?: string; admin?: boolean }) {
  const [state, formAction] = useActionState(action, idle);
  const err = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <Field label="Email" name="email" error={err.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />}
      </Field>
      <Field
        label="Password"
        name="password"
        error={err.password}
        hint={
          admin ? undefined : (
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              Forgot your password?
            </Link>
          )
        }
      >
        {(p) => <PasswordInput {...p} name="password" autoComplete="current-password" required />}
      </Field>
      <SubmitButton className="w-full" size="lg" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function SignInForm({ next }: { next?: string }) {
  return <SignInFields action={signIn} next={next} />;
}

export function AdminSignInForm({ next }: { next?: string }) {
  return <SignInFields action={adminSignIn} next={next} admin />;
}

export function SignUpForm({ next, initialRole }: { next?: string; initialRole: "student" | "owner" }) {
  const [state, formAction] = useActionState(signUp, idle);
  const [role, setRole] = useState<"student" | "owner">((state.values?.role as "student" | "owner") ?? initialRole);
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <p className="text-sm text-muted">The link expires after an hour. Check your spam folder if it has not arrived.</p>
      </div>
    );
  }

  const options = [
    { value: "student", label: "I am a student", body: "Search, save and inspect hostels.", icon: GraduationCap },
    { value: "owner", label: "I own a hostel", body: "List rooms and answer inspection requests.", icon: KeyRound },
  ] as const;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <fieldset>
        <legend className="text-sm font-medium text-ink">Account type</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {options.map((o) => (
            <label
              key={o.value}
              className={cn(
                "relative flex cursor-pointer flex-col gap-1 rounded-lg border bg-surface p-3 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/20",
                role === o.value ? "border-primary bg-primary-soft/60" : "border-line-strong hover:border-muted",
              )}
            >
              <input type="radio" name="role" value={o.value} checked={role === o.value} onChange={() => setRole(o.value)} className="sr-only" />
              <o.icon className={cn("size-5", role === o.value ? "text-primary" : "text-muted")} aria-hidden />
              <span className="text-sm font-semibold">{o.label}</span>
              <span className="text-xs leading-snug text-muted">{o.body}</span>
            </label>
          ))}
        </div>
        {err.role && <p className="mt-1.5 text-[0.8125rem] font-medium text-danger">{err.role[0]}</p>}
      </fieldset>
      <Field label="Full name" name="fullName" error={err.fullName}>
        {(p) => <Input {...p} name="fullName" autoComplete="name" required defaultValue={v.fullName} />}
      </Field>
      <Field label="Email" name="email" error={err.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" required defaultValue={v.email} />}
      </Field>
      <Field label="Password" name="password" error={err.password} hint="At least 10 characters, with a letter and a number.">
        {(p) => <PasswordInput {...p} name="password" autoComplete="new-password" required minLength={10} />}
      </Field>
      <div>
        <Checkbox
          name="terms"
          required
          defaultChecked={v.terms === "on"}
          aria-invalid={err.terms ? true : undefined}
          label={
            <span className="text-sm">
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-primary underline" target="_blank">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-primary underline" target="_blank">
                privacy policy
              </Link>
              .
            </span>
          }
        />
        {err.terms && <p className="mt-1.5 text-[0.8125rem] font-medium text-danger">{err.terms[0]}</p>}
      </div>
      <SubmitButton className="w-full" size="lg" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, idle);
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Email" name="email" error={state.fieldErrors?.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />}
      </Field>
      <SubmitButton className="w-full" size="lg" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPassword, idle);
  const err = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="New password" name="password" error={err.password} hint="At least 10 characters, with a letter and a number.">
        {(p) => <PasswordInput {...p} name="password" autoComplete="new-password" required minLength={10} />}
      </Field>
      <Field label="Confirm new password" name="confirm" error={err.confirm}>
        {(p) => <PasswordInput {...p} name="confirm" autoComplete="new-password" required />}
      </Field>
      <SubmitButton className="w-full" size="lg" pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}

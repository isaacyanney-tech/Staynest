"use client";
import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

export function SubmitButton({ children, pendingLabel, ...props }: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending && (
        <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
      )}
      {pending ? (pendingLabel ?? "Saving…") : children}
    </Button>
  );
}

/**
 * Submit buttons for small one-click forms (remove, reorder, sign out). They
 * keep their label but switch off while the form is being sent, so a double
 * click cannot send it twice.
 */
export function PendingButton({ className, disabled, ...props }: ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn("disabled:cursor-wait disabled:opacity-60", className)}
      {...props}
    />
  );
}

export function PendingFormButton({ disabled, ...props }: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props} />;
}

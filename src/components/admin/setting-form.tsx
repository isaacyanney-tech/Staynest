"use client";
import { useActionState } from "react";
import { saveBusinessSetting } from "@/lib/actions/admin";
import { idle } from "@/lib/forms";
import type { Json } from "@/lib/supabase/database.types";
import { Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** One business setting. The input matches the stored value's type. */
export function SettingForm({ settingKey, label, value }: { settingKey: string; label: string; value: Json }) {
  const [state, action] = useActionState(saveBusinessSetting, idle);
  const id = `setting-${settingKey.replace(/[^a-z0-9]/g, "-")}`;
  const sent = state.status === "error" ? state.values?.value : undefined;
  const error = state.status === "error" ? state.message : undefined;
  return (
    <form action={action} className="flex flex-wrap items-start gap-2" noValidate>
      <input type="hidden" name="key" value={settingKey} />
      {typeof value === "boolean" ? (
        <label htmlFor={id} className="flex h-10 cursor-pointer items-center gap-2.5 text-[0.9375rem]">
          <input id={id} type="checkbox" name="value" defaultChecked={value} className="size-4 accent-[var(--brand-primary)]" />
          On
        </label>
      ) : typeof value === "string" && value.length > 80 ? (
        <>
          <label htmlFor={id} className="sr-only">{label}</label>
          <Textarea id={id} name="value" rows={3} maxLength={500} defaultValue={sent ?? value} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className="min-w-0 flex-1 basis-72" />
        </>
      ) : (
        <>
          <label htmlFor={id} className="sr-only">{label}</label>
          <Input
            id={id}
            name="value"
            inputMode={typeof value === "number" ? "decimal" : undefined}
            defaultValue={sent ?? (typeof value === "number" || typeof value === "string" ? String(value) : "")}
            maxLength={500}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={typeof value === "number" ? "w-36" : "min-w-0 flex-1 basis-60"}
          />
        </>
      )}
      <SubmitButton variant="outline" pendingLabel="Saving…">
        Save
      </SubmitButton>
      {error && (
        <p id={`${id}-error`} role="alert" className="w-full text-[0.8125rem] font-medium text-danger">
          {error}
        </p>
      )}
      {state.status === "success" && (
        <p role="status" className="w-full text-[0.8125rem] text-success">
          {state.message}
        </p>
      )}
    </form>
  );
}

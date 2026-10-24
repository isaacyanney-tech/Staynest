import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-md border border-line-strong bg-surface px-3 text-[0.9375rem] text-ink placeholder:text-muted/80 transition-[border-color,box-shadow] duration-150 hover:border-muted focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15 disabled:bg-sunken disabled:text-muted";

type FieldProps = {
  label: string;
  /** Used to build the control id; pass the input's name. */
  name: string;
  hint?: ReactNode;
  error?: string[] | string;
  optional?: boolean;
  className?: string;
  /** Needed when the same form renders twice on a page, to keep ids unique. */
  idPrefix?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
};

/** Label, hint and error wiring for a single form control. */
export function Field({ label, name, hint, error, optional, className, idPrefix = "", children }: FieldProps) {
  const id = `${idPrefix}field-${name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorText = Array.isArray(error) ? error[0] : error;
  const errorId = errorText ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": errorText ? true : undefined })}
      {hint && !errorText && (
        <p id={hintId} className="text-[0.8125rem] text-muted">
          {hint}
        </p>
      )}
      {errorText && (
        <p id={errorId} className="text-[0.8125rem] font-medium text-danger">
          {errorText}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        control,
        "h-10 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%2364748b' stroke-width='1.6'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E\")] bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-[0.9375rem] text-ink", className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-sm border-line-strong accent-[var(--color-brand)]"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

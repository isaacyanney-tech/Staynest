import type { z } from "zod";

export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Echo of submitted values so the form can be re-filled after an error. */
  values?: Record<string, string>;
};

export const idle: FormState = { status: "idle" };

export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    // Repeated names (checkbox groups) are joined with commas.
    if (typeof v === "string" && !k.startsWith("$") && !/password|confirm/i.test(k)) out[k] = k in out ? `${out[k]},${v}` : v;
  }
  return out;
}

export function fromZodError(error: z.ZodError, formData?: FormData, message = "Check the highlighted fields."): FormState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { status: "error", message, fieldErrors, values: formData ? formValues(formData) : undefined };
}

/** Maps database errors to messages a person can act on. */
export function friendlyDbError(error: { code?: string; message: string } | null | undefined, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  switch (error.code) {
    case "42501":
      return error.message && !error.message.startsWith("new row violates") ? error.message : "You do not have permission to do that.";
    case "P0001":
    case "22023":
      return error.message;
    case "23505":
      return "That already exists. Try a different name.";
    case "23514":
      return "Some values are outside the allowed range.";
    default:
      return fallback;
  }
}

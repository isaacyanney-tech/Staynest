"use client";
import { useState } from "react";
import type { FormState } from "@/lib/forms";

/**
 * The selected value of a radio group in a form that submits to a server
 * action. React resets the form after each submission, which puts radios back
 * to their default, so radios must be uncontrolled (`defaultChecked`). This
 * keeps the visible choice in step: after an error it becomes the value that
 * was sent, which is also what the reset restores.
 */
export function useChoice<T extends string>(state: FormState, field: string, initial: T): [T, (value: T) => void] {
  const [choice, setChoice] = useState<T>(initial);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    const sent = state.status === "error" ? state.values?.[field] : undefined;
    if (sent) setChoice(sent as T);
  }
  return [choice, setChoice];
}

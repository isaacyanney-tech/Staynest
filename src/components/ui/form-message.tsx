"use client";
import { useEffect, useRef } from "react";
import type { FormState } from "@/lib/forms";
import { Notice } from "./states";

/** Shows the result of a server action and moves focus to it for screen readers. */
export function FormMessage({ state }: { state: FormState }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status !== "idle") ref.current?.focus();
  }, [state]);
  if (state.status === "idle" || !state.message) return null;
  return (
    <div ref={ref} tabIndex={-1} className="outline-none">
      <Notice tone={state.status === "success" ? "success" : "danger"}>{state.message}</Notice>
    </div>
  );
}

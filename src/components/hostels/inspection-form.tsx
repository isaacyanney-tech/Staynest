"use client";
import { useActionState } from "react";
import { requestInspection } from "@/lib/actions/students";
import { idle } from "@/lib/forms";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

type Room = { id: string; name: string; price: string; available: number };

export function InspectionForm({ hostelId, rooms, minDate, maxDate }: { hostelId: string; rooms: Room[]; minDate: string; maxDate: string }) {
  const [state, action] = useActionState(requestInspection, idle);
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};

  if (state.status === "success") {
    return <FormMessage state={state} />;
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="hostelId" value={hostelId} />
      <FormMessage state={state} />
      {rooms.length > 0 && (
        <fieldset aria-describedby={err.roomTypeId ? "roomTypeId-error" : undefined}>
          <legend className="text-sm font-medium text-ink">Which room do you want to see?</legend>
          <div className="mt-2 grid gap-2">
            {[...rooms, null].map((r) => {
              const full = r !== null && r.available === 0;
              return (
                <label
                  key={r?.id ?? "unsure"}
                  className={`flex items-center gap-3 rounded-md border border-line-strong bg-surface px-3 py-2.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-primary-soft has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand/25 ${full ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <input
                    type="radio"
                    name="roomTypeId"
                    value={r?.id ?? ""}
                    disabled={full}
                    defaultChecked={(v.roomTypeId ?? "") === (r?.id ?? "")}
                    className="accent-[var(--color-brand)]"
                  />
                  <span className="flex-1">
                    <span className="block font-medium text-ink">{r ? r.name : "Not sure yet"}</span>
                    {r && <span className="block text-muted">{full ? "Fully booked" : `${r.price} · ${r.available} available`}</span>}
                  </span>
                </label>
              );
            })}
          </div>
          {err.roomTypeId && (
            <p id="roomTypeId-error" className="mt-1.5 text-[0.8125rem] font-medium text-danger">
              {err.roomTypeId[0]}
            </p>
          )}
        </fieldset>
      )}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Preferred date" name="preferredDate" error={err.preferredDate}>
          {(p) => <Input {...p} name="preferredDate" type="date" required min={minDate} max={maxDate} defaultValue={v.preferredDate} />}
        </Field>
        <Field label="Time" name="preferredTime" error={err.preferredTime}>
          {(p) => (
            <Select {...p} name="preferredTime" defaultValue={v.preferredTime ?? "morning"} className="min-w-32">
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </Select>
          )}
        </Field>
      </div>
      <Field label="Message to the owner" name="message" optional error={err.message} hint="Questions about water, power or moving-in dates help the owner prepare.">
        {(p) => <Textarea {...p} name="message" maxLength={1000} rows={3} defaultValue={v.message} />}
      </Field>
      <SubmitButton className="w-full" pendingLabel="Sending request…">
        Request an inspection
      </SubmitButton>
    </form>
  );
}

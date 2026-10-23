"use client";
import { useActionState } from "react";
import { requestInspection } from "@/lib/actions/students";
import { idle } from "@/lib/forms";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

type Room = { id: string; name: string };

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
        <Field label="Room you are interested in" name="roomTypeId" optional error={err.roomTypeId}>
          {(p) => (
            <Select {...p} name="roomTypeId" defaultValue={v.roomTypeId ?? ""}>
              <option value="">Not sure yet</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
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

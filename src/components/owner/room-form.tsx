"use client";
import { useActionState, useEffect, useRef } from "react";
import { saveRoom } from "@/lib/actions/owner";
import { PERIOD_LABEL } from "@/lib/format";
import { idle } from "@/lib/forms";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export type RoomFormValues = {
  id: string;
  name: string;
  occupancy: number;
  price_amount: number;
  price_period: string;
  total_rooms: number;
  available_rooms: number;
  description: string;
};

/** Adds a room type, or edits one when `room` is given. */
export function RoomForm({ hostelId, room }: { hostelId: string; room?: RoomFormValues }) {
  const [state, action] = useActionState(saveRoom, idle);
  const err = state.fieldErrors ?? {};
  const sent = state.status === "error" ? state.values : undefined;
  const prefix = room ? `room-${room.id}-` : "new-room-";
  const v = (key: string, fallback: string) => sent?.[key] ?? fallback;
  // React resets the form after each save, and a select goes back to the option
  // it first rendered with, not the period just saved. Put the saved one back.
  const periodRef = useRef<HTMLSelectElement>(null);
  const period = v("period", room?.price_period ?? "academic_year");
  useEffect(() => {
    if (periodRef.current) periodRef.current.value = period;
  }, [state, period]);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="hostelId" value={hostelId} />
      {room && <input type="hidden" name="roomId" value={room.id} />}
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Room type" name="name" idPrefix={prefix} error={err.name} hint="For example “Two in a room” or “Self-contained single”.">
          {(p) => <Input {...p} name="name" required maxLength={80} defaultValue={v("name", room?.name ?? "")} />}
        </Field>
        <Field label="People per room" name="occupancy" idPrefix={prefix} error={err.occupancy}>
          {(p) => <Input {...p} name="occupancy" type="number" inputMode="numeric" min={1} max={12} step={1} required defaultValue={v("occupancy", String(room?.occupancy ?? 2))} />}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price per person (GHS)" name="price" idPrefix={prefix} error={err.price}>
          {(p) => <Input {...p} name="price" type="number" inputMode="decimal" min={1} step="0.01" required defaultValue={v("price", room ? String(room.price_amount) : "")} />}
        </Field>
        <Field label="Charged" name="period" idPrefix={prefix} error={err.period}>
          {(p) => (
            <Select {...p} ref={periodRef} name="period" defaultValue={period}>
              {Object.entries(PERIOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label[0].toUpperCase() + label.slice(1)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Rooms of this type" name="total" idPrefix={prefix} error={err.total}>
          {(p) => <Input {...p} name="total" type="number" inputMode="numeric" min={0} step={1} required defaultValue={v("total", String(room?.total_rooms ?? 1))} />}
        </Field>
        <Field label="Available now" name="available" idPrefix={prefix} error={err.available}>
          {(p) => <Input {...p} name="available" type="number" inputMode="numeric" min={0} step={1} required defaultValue={v("available", String(room?.available_rooms ?? 1))} />}
        </Field>
      </div>
      <Field label="What's included" name="description" idPrefix={prefix} optional error={err.description} hint="Beds, wardrobes, bathroom, kitchen access.">
        {(p) => <Textarea {...p} name="description" rows={2} maxLength={1000} className="min-h-20" defaultValue={v("description", room?.description ?? "")} />}
      </Field>
      <SubmitButton variant={room ? "primary" : "outline"} pendingLabel="Saving room…">
        {room ? "Save room" : "Add room"}
      </SubmitButton>
    </form>
  );
}

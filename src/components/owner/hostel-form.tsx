"use client";
import { useActionState } from "react";
import { createHostel, updateHostel } from "@/lib/actions/owner";
import { AMENITIES, GENDER_LABEL } from "@/lib/format";
import { idle } from "@/lib/forms";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export type HostelFormValues = {
  id: string;
  name: string;
  summary: string;
  description: string;
  universityId: string | null;
  address: string;
  area: string;
  city: string;
  distanceKm: number | null;
  gender: string;
  amenities: string[];
  houseRules: string;
  contactPhone: string | null;
};

type University = { id: string; name: string; shortName: string };

/** Listing details. Creates a draft, or saves changes to an existing listing. */
export function HostelForm({ hostel, universities }: { hostel?: HostelFormValues; universities: University[] }) {
  const [state, action] = useActionState(hostel ? updateHostel : createHostel, idle);
  const err = state.fieldErrors ?? {};
  // After a failed save the form is re-filled from what was sent.
  const sent = state.status === "error" ? state.values : undefined;
  const v = (key: keyof HostelFormValues, fallback = "") => sent?.[key] ?? (hostel?.[key] != null ? String(hostel[key]) : fallback);
  const amenities = new Set(sent ? (sent.amenities ?? "").split(",") : (hostel?.amenities ?? []));

  return (
    <form action={action} className="space-y-8" noValidate>
      {hostel && <input type="hidden" name="hostelId" value={hostel.id} />}
      <FormMessage state={state} />

      <fieldset className="space-y-5">
        <legend className="text-base font-semibold text-ink">About the hostel</legend>
        <Field label="Hostel name" name="name" error={err.name}>
          {(p) => <Input {...p} name="name" required maxLength={120} defaultValue={v("name")} autoComplete="organization" />}
        </Field>
        <Field
          label="Short summary"
          name="summary"
          error={err.summary}
          hint="One or two sentences shown on search results. Needed before you submit for review."
        >
          {(p) => <Textarea {...p} name="summary" rows={2} maxLength={240} className="min-h-20" defaultValue={v("summary")} />}
        </Field>
        <Field label="Full description" name="description" optional error={err.description} hint="Rooms, facilities, transport and anything students ask about often.">
          {(p) => <Textarea {...p} name="description" rows={7} maxLength={6000} defaultValue={v("description")} />}
        </Field>
        <Field label="Who can stay" name="gender" error={err.gender}>
          {(p) => (
            <Select {...p} name="gender" defaultValue={v("gender", "mixed")}>
              {Object.entries(GENDER_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-base font-semibold text-ink">Location</legend>
        <Field label="Nearest university" name="universityId" optional error={err.universityId}>
          {(p) => (
            <Select {...p} name="universityId" defaultValue={v("universityId")}>
              <option value="">Not near a listed campus</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.shortName})
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Area or neighbourhood" name="area" error={err.area}>
            {(p) => <Input {...p} name="area" required maxLength={80} defaultValue={v("area")} placeholder="Okponglo" />}
          </Field>
          <Field label="Town or city" name="city" error={err.city}>
            {(p) => <Input {...p} name="city" required maxLength={80} defaultValue={v("city")} placeholder="Accra" autoComplete="address-level2" />}
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <Field label="Street address or directions" name="address" optional error={err.address}>
            {(p) => <Input {...p} name="address" maxLength={200} defaultValue={v("address")} autoComplete="street-address" />}
          </Field>
          <Field label="Distance to campus (km)" name="distanceKm" optional error={err.distanceKm}>
            {(p) => <Input {...p} name="distanceKm" type="number" inputMode="decimal" min={0} max={200} step={0.1} defaultValue={v("distanceKm")} />}
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-base font-semibold text-ink">Amenities</legend>
        <p className="mt-1 text-sm text-muted">Tick only what every resident can use today.</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(AMENITIES).map(([key, label]) => (
            <Checkbox key={key} name="amenities" value={key} label={label} defaultChecked={amenities.has(key)} />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-base font-semibold text-ink">Rules and contact</legend>
        <Field label="House rules" name="houseRules" optional error={err.houseRules} hint="Visiting hours, quiet hours, cooking, utilities and deposits.">
          {(p) => <Textarea {...p} name="houseRules" rows={4} maxLength={3000} defaultValue={v("houseRules")} />}
        </Field>
        <Field
          label="Phone for students"
          name="contactPhone"
          optional
          error={err.contactPhone}
          hint="Shown on your public listing so students can call you."
        >
          {(p) => <Input {...p} name="contactPhone" type="tel" maxLength={20} defaultValue={v("contactPhone")} autoComplete="tel" placeholder="+233 20 123 4567" />}
        </Field>
      </fieldset>

      <SubmitButton pendingLabel={hostel ? "Saving…" : "Creating draft…"}>{hostel ? "Save details" : "Create draft"}</SubmitButton>
    </form>
  );
}

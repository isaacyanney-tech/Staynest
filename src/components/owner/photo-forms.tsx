"use client";
import { useActionState, useState } from "react";
import { updatePhoto, uploadPhoto } from "@/lib/actions/owner";
import { idle } from "@/lib/forms";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

const MAX_MB = 8;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export function PhotoUploadForm({ hostelId, remaining }: { hostelId: string; remaining: number }) {
  const [state, action] = useActionState(uploadPhoto, idle);
  const [tooBig, setTooBig] = useState<string | null>(null);
  const err = state.fieldErrors ?? {};
  const sent = state.status === "error" ? state.values : undefined;
  const fileError = tooBig ?? err.photo;

  return (
    <form
      action={action}
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        // Checked here too so a large file fails fast instead of uploading first.
        const file = new FormData(e.currentTarget).get("photo");
        if (file instanceof File && file.size > MAX_MB * 1024 * 1024) {
          e.preventDefault();
          setTooBig(`That photo is larger than ${MAX_MB} MB. Export a smaller copy and try again.`);
        }
      }}
    >
      <input type="hidden" name="hostelId" value={hostelId} />
      <FormMessage state={state} />
      <Field label="Photo" name="photo" error={fileError} hint={`JPEG, PNG, WebP or AVIF, up to ${MAX_MB} MB, at least 400 × 300 pixels.`}>
        {(p) => (
          <Input
            {...p}
            name="photo"
            type="file"
            accept={ACCEPT}
            required
            disabled={remaining <= 0}
            onChange={() => setTooBig(null)}
            className="h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-primary-soft file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand"
          />
        )}
      </Field>
      <Field
        label="Describe the photo"
        name="alt"
        error={err.alt}
        hint="Read aloud to people using screen readers, for example “Two-bed room with desks and a ceiling fan”."
      >
        {(p) => <Input {...p} name="alt" required minLength={3} maxLength={200} defaultValue={sent?.alt} disabled={remaining <= 0} />}
      </Field>
      <Field label="Caption" name="caption" optional error={err.caption}>
        {(p) => <Input {...p} name="caption" maxLength={200} defaultValue={sent?.caption} disabled={remaining <= 0} />}
      </Field>
      <SubmitButton pendingLabel="Uploading…" disabled={remaining <= 0}>
        Upload photo
      </SubmitButton>
    </form>
  );
}

export function PhotoDetailsForm({ hostelId, photo }: { hostelId: string; photo: { id: string; alt: string; caption: string | null } }) {
  const [state, action] = useActionState(updatePhoto, idle);
  const err = state.fieldErrors ?? {};
  const prefix = `photo-${photo.id}-`;
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="hostelId" value={hostelId} />
      <input type="hidden" name="photoId" value={photo.id} />
      <FormMessage state={state} />
      <Field label="Description" name="alt" idPrefix={prefix} error={err.alt}>
        {(p) => <Input {...p} name="alt" required minLength={3} maxLength={200} defaultValue={photo.alt} />}
      </Field>
      <Field label="Caption" name="caption" idPrefix={prefix} optional>
        {(p) => <Input {...p} name="caption" maxLength={200} defaultValue={photo.caption ?? ""} />}
      </Field>
      <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">
        Save details
      </SubmitButton>
    </form>
  );
}

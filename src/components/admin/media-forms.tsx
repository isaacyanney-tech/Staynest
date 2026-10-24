"use client";
import { useActionState, useState } from "react";
import { deleteMedia, updateMedia, uploadMedia } from "@/lib/actions/media";
import { idle } from "@/lib/forms";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

const MAX_MB = 8;

export function MediaUploadForm() {
  const [state, action] = useActionState(uploadMedia, idle);
  const [tooBig, setTooBig] = useState<string | null>(null);
  const err = state.fieldErrors ?? {};
  const v = state.status === "error" ? state.values : undefined;
  return (
    <form
      action={action}
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        const file = new FormData(e.currentTarget).get("file");
        if (file instanceof File && file.size > MAX_MB * 1024 * 1024) {
          e.preventDefault();
          setTooBig(`That image is larger than ${MAX_MB} MB. Export a smaller copy and try again.`);
        }
      }}
    >
      <FormMessage state={state} />
      <Field label="Image" name="file" idPrefix="media-" error={tooBig ?? err.file} hint={`JPEG, PNG, WebP or AVIF, up to ${MAX_MB} MB. It is converted to WebP and location data is removed.`}>
        {(p) => (
          <Input
            {...p}
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={() => setTooBig(null)}
            className="h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-primary-soft file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand"
          />
        )}
      </Field>
      <DetailFields prefix="media-" err={err} values={v} />
      <div>
        <Checkbox name="rights" defaultChecked={v?.rights === "on"} label="I took this image, or its licence allows StayNest to use it, and the credit above is correct." />
        {err.rights && <p className="mt-1 text-[0.8125rem] font-medium text-danger">{err.rights[0]}</p>}
      </div>
      <SubmitButton pendingLabel="Uploading…">Upload image</SubmitButton>
    </form>
  );
}

function DetailFields({
  prefix,
  err,
  values,
  initial,
}: {
  prefix: string;
  err: Record<string, string[] | undefined>;
  values?: Record<string, string>;
  initial?: { alt: string; caption: string | null; credit: string | null; illustrative: boolean };
}) {
  return (
    <>
      <Field label="Describe the image" name="alt" idPrefix={prefix} error={err.alt} hint="Read aloud by screen readers, for example “Students walking to a hostel gate in Kumasi”.">
        {(p) => <Input {...p} name="alt" maxLength={200} defaultValue={values?.alt ?? initial?.alt} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Caption" name="caption" idPrefix={prefix} optional error={err.caption}>
          {(p) => <Input {...p} name="caption" maxLength={200} defaultValue={values?.caption ?? initial?.caption ?? ""} />}
        </Field>
        <Field label="Credit" name="credit" idPrefix={prefix} optional error={err.credit} hint="Photographer and licence, if not your own.">
          {(p) => <Input {...p} name="credit" maxLength={200} defaultValue={values?.credit ?? initial?.credit ?? ""} />}
        </Field>
      </div>
      <Checkbox
        name="illustrative"
        defaultChecked={values ? values.illustrative === "on" : initial?.illustrative}
        label="Illustrative: not a photo of a real StayNest hostel. It is labelled as such on the site."
      />
    </>
  );
}

export function MediaDetailsForm({ item }: { item: { id: string; alt_text: string; caption: string | null; credit: string | null; is_illustrative: boolean; status: string } }) {
  const [state, action] = useActionState(updateMedia, idle);
  const [delState, del] = useActionState(deleteMedia, idle);
  const err = state.fieldErrors ?? {};
  const v = state.status === "error" ? state.values : undefined;
  const prefix = `m-${item.id}-`;
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="mediaId" value={item.id} />
        <FormMessage state={state} />
        <DetailFields prefix={prefix} err={err} values={v} initial={{ alt: item.alt_text, caption: item.caption, credit: item.credit, illustrative: item.is_illustrative }} />
        <Checkbox name="active" defaultChecked={v ? v.active === "on" : item.status === "active"} label="Available to choose in the content editor" />
        <SubmitButton size="sm" pendingLabel="Saving…">
          Save details
        </SubmitButton>
      </form>
      <form action={del} className="border-t border-line pt-3">
        <input type="hidden" name="mediaId" value={item.id} />
        <FormMessage state={delState} />
        <SubmitButton size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" pendingLabel="Deleting…">
          Delete image
        </SubmitButton>
      </form>
    </div>
  );
}

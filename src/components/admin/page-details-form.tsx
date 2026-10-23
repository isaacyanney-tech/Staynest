"use client";
import { useActionState } from "react";
import { savePageDetails } from "@/lib/actions/content";
import { idle } from "@/lib/forms";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function PageDetailsForm({ page }: { page: { id: string; title: string; seo_title: string | null; seo_description: string | null } }) {
  const [state, action] = useActionState(savePageDetails, idle);
  const err = state.fieldErrors ?? {};
  const v = state.status === "error" ? state.values : undefined;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="pageId" value={page.id} />
      <FormMessage state={state} />
      <Field label="Page name" name="title" hint="Used in the admin area and as the browser tab title when no search title is set." error={err.title}>
        {(p) => <Input {...p} name="title" maxLength={120} defaultValue={v?.title ?? page.title} />}
      </Field>
      <Field label="Search title" name="seo_title" optional hint="Up to 70 characters." error={err.seo_title}>
        {(p) => <Input {...p} name="seo_title" maxLength={70} defaultValue={v?.seo_title ?? page.seo_title ?? ""} />}
      </Field>
      <Field label="Search description" name="seo_description" optional hint="The summary shown under the link in search results. Up to 170 characters." error={err.seo_description}>
        {(p) => <Textarea {...p} name="seo_description" rows={3} maxLength={170} defaultValue={v?.seo_description ?? page.seo_description ?? ""} />}
      </Field>
      <SubmitButton variant="outline" pendingLabel="Saving…">
        Save page details
      </SubmitButton>
    </form>
  );
}

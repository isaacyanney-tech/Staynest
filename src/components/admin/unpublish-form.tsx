"use client";
import { useActionState } from "react";
import { unpublishSection } from "@/lib/actions/content";
import { idle } from "@/lib/forms";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function UnpublishForm({ sectionId }: { sectionId: string }) {
  const [state, action] = useActionState(unpublishSection, idle);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="sectionId" value={sectionId} />
      <FormMessage state={state} />
      <p className="text-sm text-ink/75">Removes this section from the live site. Your draft and earlier versions are kept.</p>
      <SubmitButton variant="outline" size="sm" pendingLabel="Removing…">
        Take off the site
      </SubmitButton>
    </form>
  );
}

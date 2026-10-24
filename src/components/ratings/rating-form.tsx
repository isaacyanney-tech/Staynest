"use client";
import { useActionState, useState } from "react";
import { deleteRating, saveRating } from "@/lib/actions/students";
import { idle } from "@/lib/forms";
import { RATING_LABELS } from "@/lib/hostels/rating-schema";
import type { MyRating } from "@/lib/hostels/ratings";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { PeekRating } from "./peek-rating";

/** Lets a student who inspected the hostel rate it, or change or remove their rating. */
export function RatingForm({ hostelId, mine }: { hostelId: string; mine: MyRating }) {
  const [state, action] = useActionState(saveRating, idle);
  const values = state.values ?? {};
  const [stars, setStars] = useState(() => Number(values.stars ?? mine?.stars ?? 0));
  const err = state.fieldErrors ?? {};

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="hostelId" value={hostelId} />
        <input type="hidden" name="stars" value={stars || ""} />
        <FormMessage state={state} />
        {mine?.hidden && (
          <p className="rounded-md bg-warning-soft p-3 text-sm text-warning">
            A moderator has hidden your rating from other visitors. You can still edit it.
          </p>
        )}
        <div>
          <p id="rating-stars-label" className="text-sm font-medium text-ink">
            Your rating
          </p>
          <PeekRating
            value={stars}
            onChange={setStars}
            labels={RATING_LABELS}
            size={32}
            ariaLabel="Your rating"
            ariaDescribedBy={err.stars ? "rating-stars-error" : undefined}
            activeColor="var(--color-star)"
            idleColor="var(--color-star-idle)"
            tipColor="var(--color-text)"
            tipTextColor="var(--color-surface)"
            allowClear={false}
          />
          <p className="mt-1 text-sm text-muted" aria-live="polite">
            {stars ? `${stars} of 5, ${RATING_LABELS[stars - 1]}` : "Choose from 1 to 5 stars."}
          </p>
          {err.stars && (
            <p id="rating-stars-error" className="mt-1 text-sm text-danger">
              {err.stars}
            </p>
          )}
        </div>
        <Field label="What should other students know?" name="comment" optional error={err.comment} hint="Water, power, security, noise, how the owner treated you. Up to 600 characters.">
          {(p) => <Textarea {...p} name="comment" maxLength={600} rows={3} defaultValue={values.comment ?? mine?.comment ?? ""} />}
        </Field>
        <SubmitButton pendingLabel="Saving rating…">{mine ? "Update my rating" : "Post my rating"}</SubmitButton>
      </form>
      {mine && (
        <form action={deleteRating}>
          <input type="hidden" name="hostelId" value={hostelId} />
          <SubmitButton variant="ghost" size="sm" pendingLabel="Removing…">
            Remove my rating
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

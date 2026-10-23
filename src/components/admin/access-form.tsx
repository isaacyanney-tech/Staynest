"use client";
import { useActionState } from "react";
import { updateUserAccess } from "@/lib/actions/admin";
import { idle } from "@/lib/forms";
import { Checkbox, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "owner", label: "Hostel owner" },
  { value: "admin", label: "Administrator" },
] as const;

/** Role and suspension for one account, saved together. */
export function AccessForm({ userId, name, role, suspended }: { userId: string; name: string; role: string; suspended: boolean }) {
  const [state, action] = useActionState(updateUserAccess, idle);
  return (
    <form action={action} className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label={`Access for ${name}`}>
      <input type="hidden" name="userId" value={userId} />
      <label className="sr-only" htmlFor={`role-${userId}`}>
        Role for {name}
      </label>
      <Select id={`role-${userId}`} name="role" defaultValue={role} className="w-40">
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </Select>
      <Checkbox name="suspended" defaultChecked={suspended} label="Suspended" />
      <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">
        Save
      </SubmitButton>
      {state.status !== "idle" && (
        <p role="status" className={state.status === "success" ? "w-full text-sm text-success" : "w-full text-sm font-medium text-danger"}>
          {state.message}
        </p>
      )}
    </form>
  );
}

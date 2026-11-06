"use client";

import { useActionState, useId } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/fields";
import { Label } from "@/components/ui/label";
import { idleState } from "@/lib/form-state";
import { inviteMember } from "./actions";

export function InviteForm({ canInviteManagers }: { canInviteManagers: boolean }) {
  const [state, action] = useActionState(inviteMember, idleState);
  const roleId = useId();
  return (
    // key: clear the fields after each successful invitation
    <form key={state.status === "success" ? state.message : "form"} action={action} noValidate className="mt-5 space-y-4">
      <FormMessage state={state} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <TextField name="email" label="Email" type="email" autoComplete="off" required state={state} className="flex-1" />
        {canInviteManagers && (
          <div className="space-y-2 sm:w-44">
            <Label htmlFor={roleId}>Role</Label>
            <select
              id={roleId}
              name="role"
              defaultValue={state.status === "error" ? state.values?.role : "EMPLOYEE"}
              className="h-10 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
        )}
      </div>
      <SubmitButton pendingText="Sending…">Send invitation</SubmitButton>
    </form>
  );
}

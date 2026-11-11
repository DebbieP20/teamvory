"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { addTimeOff } from "@/lib/availability-actions";
import { idleState } from "@/lib/form-state";

export function AddTimeOffForm({ membershipId, minDate }: { membershipId: string; minDate: string }) {
  const [state, action] = useActionState(addTimeOff, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  // Clear the dates after a successful save.
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} noValidate className="mt-4 space-y-4">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="startDate" label="First day" type="date" min={minDate} required state={state} />
        <TextField name="endDate" label="Last day" type="date" min={minDate} required state={state} />
      </div>
      <TextField name="note" label="Note (optional)" maxLength={200} placeholder="e.g. Family trip" state={state} />
      <SubmitButton pendingText="Saving…">Add time off</SubmitButton>
    </form>
  );
}

export function RemoveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="lg" disabled={pending} aria-label={`Remove: ${label}`}>
      Remove
    </Button>
  );
}

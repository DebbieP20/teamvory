"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/fields";
import { idleState } from "@/lib/form-state";
import { createBusiness } from "../actions";

export function CreateBusinessForm() {
  const [state, action] = useActionState(createBusiness, idleState);
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <TextField name="businessName" label="Business name" autoComplete="organization" required state={state} />
      <SubmitButton pendingText="Creating…" className="w-full">
        Create business
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/fields";
import { idleState } from "@/lib/form-state";
import { requestPasswordReset } from "../actions";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, idleState);
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <TextField name="email" label="Email" type="email" autoComplete="email" required state={state} />
      <SubmitButton pendingText="Sending…" className="w-full">
        Send reset link
      </SubmitButton>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/fields";
import { idleState } from "@/lib/form-state";
import { resetPassword } from "../actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, idleState);
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      {state.status === "error" && state.message && (
        <Link href="/forgot-password" className="block text-sm font-semibold text-teal-dark hover:underline">
          Ask for a new link
        </Link>
      )}
      <input type="hidden" name="token" value={token} />
      <TextField
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
        state={state}
      />
      <TextField name="confirm" label="Type it again" type="password" autoComplete="new-password" required state={state} />
      <SubmitButton pendingText="Saving…" className="w-full">
        Save new password
      </SubmitButton>
    </form>
  );
}

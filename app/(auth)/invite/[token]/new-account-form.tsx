"use client";

import { useActionState, useId } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { idleState } from "@/lib/form-state";
import { acceptInvitationNewAccount } from "../../actions";

export function NewAccountForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(acceptInvitationNewAccount, idleState);
  const emailId = useId();
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor={emailId}>Email</Label>
        <Input id={emailId} value={email} readOnly disabled className="h-10" />
      </div>
      <TextField name="name" label="Your name" autoComplete="name" required state={state} />
      <TextField
        name="password"
        label="Choose a password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
        state={state}
      />
      <SubmitButton pendingText="Creating your account…" className="w-full">
        Create account and join
      </SubmitButton>
    </form>
  );
}

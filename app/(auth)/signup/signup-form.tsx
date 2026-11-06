"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/fields";
import { idleState } from "@/lib/form-state";
import { signUp } from "../actions";

export function SignUpForm() {
  const [state, action] = useActionState(signUp, idleState);
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <TextField name="name" label="Your name" autoComplete="name" required state={state} />
      <TextField name="businessName" label="Business name" autoComplete="organization" required state={state} />
      <TextField name="email" label="Email" type="email" autoComplete="email" required state={state} />
      <TextField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters. A short phrase is easy to remember and hard to guess."
        state={state}
      />
      <SubmitButton pendingText="Creating your business…" className="w-full">
        Create business
      </SubmitButton>
      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline">Terms</Link> and{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}

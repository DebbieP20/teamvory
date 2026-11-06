"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/fields";
import { idleState } from "@/lib/form-state";
import { logIn } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(logIn, idleState);
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <TextField name="email" label="Email" type="email" autoComplete="email" required state={state} />
      <div className="space-y-2">
        <TextField name="password" label="Password" type="password" autoComplete="current-password" required state={state} />
        <Link href="/forgot-password" className="inline-block text-sm font-semibold text-teal-dark hover:underline">
          Forgot your password?
        </Link>
      </div>
      <SubmitButton pendingText="Logging in…" className="w-full">
        Log in
      </SubmitButton>
    </form>
  );
}

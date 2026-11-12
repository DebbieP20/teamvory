"use client";

import { createContext, useContext, useState } from "react";
import { FormMessage } from "@/components/forms/fields";
import { type FormState, idleState } from "@/lib/form-state";

// Request buttons sit in rows that disappear once the request is done (picked up,
// accepted, cancelled), taking their message with them. The banner keeps the last
// result at the top of the page instead.

const ResultContext = createContext<((state: FormState) => void) | null>(null);

export function ResultBanner({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FormState>(idleState);
  return (
    <ResultContext value={setState}>
      <div aria-live="polite">{state.status !== "idle" && <FormMessage state={state} />}</div>
      {children}
    </ResultContext>
  );
}

export const useResultBanner = () => useContext(ResultContext);

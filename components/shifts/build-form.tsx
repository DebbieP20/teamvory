"use client";

import { RefreshCwIcon, SparklesIcon } from "lucide-react";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms/fields";
import { idleState } from "@/lib/form-state";
import { buildSchedule } from "@/lib/schedule-actions";

/**
 * Build schedule (first time) or Regenerate (a different fair mix). Pinned shifts,
 * which include everything placed by hand, always stay.
 */
export function BuildForm({ monday, regenerate }: { monday: string; regenerate: boolean }) {
  const [state, action, pending] = useActionState(buildSchedule, idleState);
  return (
    <div className="space-y-2">
      <form
        action={action}
        onSubmit={(e) => {
          if (regenerate && !confirm("Regenerate? The shifts the auto-scheduler placed are replaced with a new fair mix. Pinned shifts stay.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="monday" value={monday} />
        <SubmitButton
          pending={pending}
          pendingText="Building…"
          disabled={pending}
          variant={regenerate ? "outline" : "default"}
          className={regenerate ? "gap-2 border-navy text-navy" : "gap-2 bg-navy text-white hover:bg-navy/90"}
        >
          {regenerate ? <RefreshCwIcon className="size-4" aria-hidden /> : <SparklesIcon className="size-4" aria-hidden />}
          {regenerate ? "Regenerate" : "Build schedule"}
        </SubmitButton>
      </form>
      <FormMessage state={state} />
    </div>
  );
}

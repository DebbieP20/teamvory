"use client";

import { deletePattern } from "@/lib/schedule-actions";

export function DeletePatternButton({ patternId, name }: { patternId: string; name: string }) {
  return (
    <form
      action={deletePattern}
      onSubmit={(e) => {
        if (!confirm(`Delete the "${name}" pattern? Weeks already set up won't change.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="patternId" value={patternId} />
      <button type="submit" className="text-sm font-semibold text-destructive hover:underline" aria-label={`Delete: ${name}`}>
        Delete
      </button>
    </form>
  );
}

import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PatternForm } from "@/components/shifts/pattern-form";
import { DeletePatternButton } from "@/components/shifts/delete-pattern-button";
import { Button } from "@/components/ui/button";
import { addDefaultPatterns } from "@/lib/schedule-actions";
import { loadPatterns } from "@/lib/schedule-data";
import { requireManager } from "@/lib/session";

export const metadata: Metadata = { title: "Shift patterns" };

export default async function PatternsPage() {
  const { membership } = await requireManager();
  const patterns = await loadPatterns(membership.businessId);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/manager/shifts" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-dark hover:underline">
          <ArrowLeftIcon className="size-4" /> Shift setup
        </Link>
        <h1 className="mt-3 text-2xl sm:text-3xl">Shift patterns</h1>
        <p className="mt-1 text-muted-foreground">
          Saved sets of shifts you can apply to any day. Changing a pattern never changes weeks you&apos;ve already set up.
        </p>
      </div>

      {patterns.length === 0 && (
        <div className="rounded-xl border bg-white p-6">
          <p>You don&apos;t have any patterns yet.</p>
          <form action={addDefaultPatterns} className="mt-4">
            <Button type="submit" variant="outline" size="lg">
              Add Standard (12–5, 5–9 · 2 people) and Slow day (1 person)
            </Button>
          </form>
        </div>
      )}

      {patterns.map((p) => (
        <section key={p.id} aria-label={p.name} className="space-y-4 rounded-xl border bg-white p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg">{p.name}</h2>
            <DeletePatternButton patternId={p.id} name={p.name} />
          </div>
          <PatternForm pattern={p} />
        </section>
      ))}

      <section aria-labelledby="new-pattern" className="space-y-4 rounded-xl border border-dashed bg-white p-4 sm:p-6">
        <h2 id="new-pattern" className="text-lg">New pattern</h2>
        <PatternForm key={patterns.length} />
      </section>
    </div>
  );
}

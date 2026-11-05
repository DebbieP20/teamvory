import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Title block at the top of every inner page. */
export function PageHeader({ title, intro }: { title: string; intro?: React.ReactNode }) {
  return (
    <section className="bg-navy text-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="max-w-3xl text-3xl sm:text-5xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-lg text-slate-300">{intro}</p>}
      </div>
    </section>
  );
}

export function Section({
  title,
  intro,
  tone = "white",
  className,
  children,
}: {
  title?: string;
  intro?: React.ReactNode;
  tone?: "white" | "gray" | "mint";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        tone === "gray" && "bg-slate-50",
        tone === "mint" && "bg-mint",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        {title && <h2 className="text-2xl sm:text-3xl">{title}</h2>}
        {intro && <p className="mt-3 max-w-2xl text-muted-foreground">{intro}</p>}
        <div className={cn(title || intro ? "mt-10" : undefined)}>{children}</div>
      </div>
    </section>
  );
}

/** Closing call to action used at the bottom of several pages. */
export function CtaBand({ title = "Stop building schedules cell by cell." }: { title?: string }) {
  return (
    <section className="bg-mint">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Set up your business in a few minutes. Your team only needs a phone and a web browser.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-11 px-6 font-semibold">
            <Link href="/signup">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 px-6">
            <Link href="/contact">Questions? Contact us</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

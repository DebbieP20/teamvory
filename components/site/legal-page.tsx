import { PageHeader } from "@/components/site/sections";

/** Layout for the Privacy and Terms pages. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} intro={`Last updated: ${updated}`} />
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Draft.</strong> This page is a working draft and will be reviewed before TeamVory
          launches.
        </p>
        <div className="mt-10 space-y-4 text-navy/80 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:text-navy [&_li]:ml-5 [&_li]:list-disc [&_li]:marker:text-teal [&_ul]:space-y-2">
          {children}
        </div>
      </div>
    </>
  );
}

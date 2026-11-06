export default function Loading() {
  return (
    <div role="status" className="space-y-4" aria-label="Loading">
      <div className="h-8 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="h-10 animate-pulse rounded bg-slate-100" />
      <div className="h-10 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

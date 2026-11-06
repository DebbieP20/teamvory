export function PageLoading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="h-32 animate-pulse rounded-xl bg-white" />
      <div className="h-32 animate-pulse rounded-xl bg-white" />
    </div>
  );
}

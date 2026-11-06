export function AuthHeading({ title, intro }: { title: string; intro?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl">{title}</h1>
      {intro && <p className="mt-2 text-muted-foreground">{intro}</p>}
    </div>
  );
}

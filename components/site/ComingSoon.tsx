export default function ComingSoon({
  title,
  blurb,
  detail,
}: {
  title: string;
  blurb: string;
  detail?: string;
}) {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-1 items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">{title}</h1>
        <p className="mt-3 text-foreground-muted">{blurb}</p>
        <p className="mt-6 text-sm text-foreground-muted/70">{detail ?? "Coming soon."}</p>
      </div>
    </main>
  );
}

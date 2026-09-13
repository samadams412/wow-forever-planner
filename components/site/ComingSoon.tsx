export default function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">{title}</h1>
      <p className="mt-3 text-foreground-muted">{blurb}</p>
      <p className="mt-6 text-sm text-foreground-muted/70">Coming soon.</p>
    </main>
  );
}

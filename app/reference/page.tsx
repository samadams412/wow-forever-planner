import Link from "next/link";

export default function ReferencePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Reference</h1>
      <p className="mt-2 text-foreground-muted">
        Racials and race/class rules are browsable inline as part of the{" "}
        <Link href="/planner" className="text-accent hover:underline">
          planner
        </Link>{" "}
        for now -- a standalone version is planned. In the meantime:
      </p>

      <div className="mt-6 grid gap-3">
        <Link
          href="/reference/legacy-perks"
          className="rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-hover hover:border-accent"
        >
          <div className="font-medium text-foreground">Legacy Perks</div>
          <p className="mt-1 text-sm text-foreground-muted">
            Account-wide perks and rewards from the Legacy System -- static reference until the point
            cap is confirmed.
          </p>
        </Link>
      </div>
    </main>
  );
}

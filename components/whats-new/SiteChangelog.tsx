import Link from "next/link";
import type { SiteChangelogEntry } from "@/lib/patch-notes";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// "On the Site": what changed on Forevercraft itself, newest first. Plain
// server-rendered list -- no tooltips or diffs here, that's the In Game side.
export default function SiteChangelog({ entries }: { entries: SiteChangelogEntry[] }) {
  return (
    <ol className="space-y-4">
      {entries.map((e) => (
        <li key={`${e.date}-${e.title}`} className="rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-heading text-base font-semibold tracking-wide text-accent">{e.title}</h2>
            <span className="text-xs text-foreground-muted">{formatDate(e.date)}</span>
          </div>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground-muted">
            {e.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          {e.link && (
            <Link href={e.link.href} className="mt-3 inline-block text-sm text-accent hover:underline">
              {e.link.label} →
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
}

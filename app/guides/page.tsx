import type { Metadata } from "next";
import Link from "next/link";
import { getAllGuides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Leveling tips, class impressions, zone breakdowns, and patch coverage for World of Warcraft: Forever.",
};

export default function GuidesPage() {
  const guides = getAllGuides();

  return (
    <main className="mx-auto max-w-3xl px-3 py-8 sm:px-4">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Guides</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        Longer-form, less time-sensitive content -- leveling tips, class impressions, and zone/dungeon
        breakdowns.
      </p>

      {guides.length === 0 ? (
        <p className="mt-6 text-sm text-foreground-muted">No guides published yet -- check back soon.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent hover:bg-surface-hover"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="font-medium text-foreground">{guide.title}</h2>
                <span className="text-xs text-foreground-muted/70">
                  {new Date(guide.date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-foreground-muted">{guide.summary}</p>
              {guide.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {guide.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

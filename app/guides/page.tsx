import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAllGuides } from "@/lib/guides";
import Card from "@/components/site/Card";
import { mediumIconUrl } from "@/lib/wow-data";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Leveling tips, class impressions, zone breakdowns, and patch coverage for World of Warcraft: Forever.",
};

export default function GuidesPage() {
  const guides = getAllGuides();

  return (
    <main className="w-full">
      <div className="relative flex min-h-48 items-end overflow-hidden px-6 py-8 sm:min-h-64 sm:py-10">
        {/* Official World of Warcraft: Forever zone press still */}
        <Image
          src="/images/guides/hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "50% 40%" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(135deg, rgba(201,169,97,0.1), rgba(13,11,7,0.2))",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(to top, rgba(13,11,7,0.9) 0%, rgba(13,11,7,0.55) 22%, transparent 48%)",
          }}
        />

        <div className="relative mx-auto w-full max-w-3xl">
          {/* hero-text-accent/hero-text-muted, not text-accent/
              text-foreground-muted -- this sits directly over the hero photo
              with only a text-shadow for legibility, so it can't repaint
              dark in Light mode the way plain body copy does. */}
          <h1 className="hero-text-accent font-heading text-2xl font-semibold tracking-wide [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            Guides
          </h1>
          <p className="hero-text-muted mt-2 max-w-[70ch] text-sm leading-relaxed [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            Longer-form, less time-sensitive content -- leveling tips, class impressions, and zone/dungeon
            breakdowns.
          </p>
        </div>

        <p className="absolute inset-x-0 bottom-1.5 text-center text-[10px] text-foreground-muted/60">
          Image: Official World of Warcraft: Forever reveal screenshot, courtesy of Blizzard Entertainment
        </p>
      </div>

      <div className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
        {/* Not a guide post itself -- a permanent pointer to the step-by-
            step 1-300 leveling paths already living under Reference
            (/reference/professions/<id>?view=leveling), since those are
            exactly the kind of practical, actionable content someone
            landing on Guides is looking for. One card linking to the
            Professions index rather than 8+ separate cards (one per
            profession, gathering ones included) -- keeps this page from
            being dominated by profession links before any real guide
            posts exist, and the Professions index itself already lists
            every profession one click away. */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Card
            href="/reference/professions"
            title="Profession Leveling Guides"
            description="Step-by-step 1-300 leveling paths for every profession -- what to craft, where to buy the recipe, and what it takes, all in one tab per profession."
            icon={
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={mediumIconUrl("inv_scroll_03")} alt="" className="h-7 w-7 rounded-sm" />
            }
          />
        </div>

        <div className="space-y-3">
          {/* Guides List */}
          {guides.length === 0 ? (
            <p className="text-sm text-foreground-muted pt-2">No guides published yet -- check back soon.</p>
          ) : (
            guides.map((guide) => (
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
            ))
          )}
        </div>
      </div>
    </main>
  );
}
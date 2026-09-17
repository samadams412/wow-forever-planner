import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Card from "@/components/site/Card";
import { getAllGuides } from "@/lib/guides";
import { dungeons } from "@/lib/dungeons";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Leveling tips, class impressions, zone breakdowns, and patch coverage for World of Warcraft: Forever.",
};

export default function GuidesPage() {
  const guides = getAllGuides();

  return (
    <main className="w-full">
      <div className="relative flex min-h-64 items-end overflow-hidden px-6 py-10 sm:min-h-80 sm:py-14">
        {/* Official World of Warcraft: Forever zone press still, used with
            credit -- see the caption below. Same treatment as the homepage
            hero: full-bleed image, warm color-grade, then a darkening
            gradient so the title/intro stay readable over it. */}
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
            // Only darkens roughly the bottom third, where the title/intro
            // sit -- the banner is much shorter than the homepage's, so the
            // same full-height gradient there would have swallowed almost
            // the whole image instead of just the text area.
            backgroundImage: "linear-gradient(to top, rgba(13,11,7,0.9) 0%, rgba(13,11,7,0.55) 22%, transparent 48%)",
          }}
        />

        <div className="relative mx-auto w-full max-w-3xl">
          <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            Guides
          </h1>
          <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            Longer-form, less time-sensitive content -- leveling tips, class impressions, and zone/dungeon
            breakdowns.
          </p>
        </div>

        <p className="absolute inset-x-0 bottom-1.5 text-center text-[10px] text-foreground-muted/60">
          Image: Official World of Warcraft: Forever reveal screenshot, courtesy of Blizzard Entertainment
        </p>
      </div>

      <div className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
        <Card
          href="/guides/dungeons"
          title="Dungeon Level Ranges"
          description={`Every dungeon on one level-range timeline -- the ${dungeons.filter((d) => d.type === "new").length} new launch dungeons alongside all of Classic's, with details on the new ones.`}
        />

        <div className="mt-6">
          {guides.length === 0 ? (
            <p className="text-sm text-foreground-muted">No guides published yet -- check back soon.</p>
          ) : (
            <div className="space-y-3">
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
        </div>
      </div>
    </main>
  );
}

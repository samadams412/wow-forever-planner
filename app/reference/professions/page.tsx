import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import { getAllProfessions } from "@/lib/professions";

export const metadata: Metadata = {
  title: "Professions",
  description:
    "New recipes, gear, and titles coming to every crafting and gathering profession in World of Warcraft: Forever.",
};

export default function ProfessionsPage() {
  const professions = getAllProfessions();

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
      <Breadcrumbs items={[{ label: "Reference", href: "/reference" }, { label: "Professions" }]} />
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Professions</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        What&apos;s new for each crafting and gathering profession in Forever -- recipes, gear, and titles, one
        page per profession.
      </p>

      <div className="mt-6 space-y-3">
        {professions.length === 0 ? (
          <p className="text-sm text-foreground-muted">No profession write-ups published yet -- check back soon.</p>
        ) : (
          professions.map((profession) => {
            // Because getAllProfessions returns ProfessionMeta (which spreads frontmatter), 
            // title, summary, and iconUrl are right on the object.
            const { slug, title, summary, iconUrl } = profession;

            return (
              <Link
                key={slug}
                href={`/reference/professions/${slug}`}
                className="group flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent hover:bg-surface-hover"
              >
                {iconUrl && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border/50 bg-surface-muted">
                    <Image
                      src={iconUrl}
                      alt={`${title} icon`}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium text-foreground group-hover:text-accent">{title}</h2>
                  <p className="mt-1 text-sm text-foreground-muted line-clamp-2">{summary}</p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllProfessions, getProfession } from "@/lib/professions";
import { professionMdxComponents } from "@/components/professions/mdx-components";
import ProfessionImage from "@/components/professions/ProfessionImage";
import Breadcrumbs from "@/components/site/Breadcrumbs";

export function generateStaticParams() {
  return getAllProfessions().map((profession) => ({ slug: profession.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profession = getProfession(slug);
  if (!profession) return {};
  return { title: profession.frontmatter.title, description: profession.frontmatter.summary };
}

export default async function ProfessionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profession = getProfession(slug);
  if (!profession) notFound();

  const { frontmatter, content } = profession;

  // Get all professions and filter out the current one
  const otherProfessions = getAllProfessions().filter((p) => p.slug !== slug);

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
      <Breadcrumbs
        items={[
          { label: "Reference", href: "/reference" },
          { label: "Professions", href: "/reference/professions" },
          { label: frontmatter.title, truncate: true },
        ]}
      />

      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">{frontmatter.title}</h1>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-foreground-muted/70">
        <span>
          {new Date(frontmatter.date).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          })}
        </span>
      </div>

      <ProfessionImage src={frontmatter.heroImage} alt={frontmatter.heroAlt} priority />

      <article>
        <MDXRemote source={content} components={professionMdxComponents} />
      </article>

      <p className="mt-8 text-center text-xs text-foreground-muted/70">
        Tooltip screenshots courtesy of <a href="https://www.warcrafttavern.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">WarcraftTavern</a>.
      </p>

      {/* Other Professions Section */}
      {otherProfessions.length > 0 && (
        <section className="mt-12 border-t border-foreground/10 pt-8">
          <h2 className="font-heading text-lg font-medium text-foreground">Other Professions</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {otherProfessions.map((other) => {
              const { slug: otherSlug, title: otherTitle, iconUrl } = other;

              return (
                <Link
                  key={otherSlug}
                  href={`/reference/professions/${otherSlug}`}
                  className="group flex items-center justify-between rounded-lg border border-foreground/10 p-4 transition-colors hover:border-accent/50 hover:bg-accent/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {iconUrl && (
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-border/50 bg-surface-muted">
                        <Image
                          src={iconUrl}
                          alt={`${otherTitle} icon`}
                          width={36}
                          height={36}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <span className="font-medium text-foreground group-hover:text-accent truncate">
                      {otherTitle}
                    </span>
                  </div>
                  <span className="text-sm text-foreground-muted/70 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2">
                    &rarr;
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
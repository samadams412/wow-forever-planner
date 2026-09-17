import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllProfessions, getProfession } from "@/lib/professions";
import { professionMdxComponents } from "@/components/professions/mdx-components";
import ProfessionImage from "@/components/professions/ProfessionImage";
import Breadcrumbs from "@/components/site/Breadcrumbs";

export function generateStaticParams() {
  return getAllProfessions().map((profession) => ({ slug: profession.slug }));
}

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
    </main>
  );
}

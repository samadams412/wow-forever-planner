import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllGuides, getGuide } from "@/lib/guides";
import { guideMdxComponents } from "@/components/guides/mdx-components";
import GuideImage from "@/components/guides/GuideImage";
import Breadcrumbs from "@/components/site/Breadcrumbs";

export function generateStaticParams() {
  return getAllGuides().map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return { title: guide.frontmatter.title, description: guide.frontmatter.summary };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const { frontmatter, content } = guide;

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
      <Breadcrumbs
        items={[{ label: "Guides", href: "/guides" }, { label: frontmatter.title, truncate: true }]}
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
        {frontmatter.tags.map((tag) => (
          <span key={tag} className="rounded bg-accent/10 px-1.5 py-0.5 font-medium uppercase tracking-wide text-accent">
            {tag}
          </span>
        ))}
      </div>

      <GuideImage src={frontmatter.heroImage} alt={frontmatter.heroAlt} priority />

      <article>
        <MDXRemote source={content} components={guideMdxComponents} />
      </article>
    </main>
  );
}

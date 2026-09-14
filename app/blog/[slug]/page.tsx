import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPost } from "@/lib/blog";
import { blogMdxComponents } from "@/components/blog/mdx-components";
import GuideImage from "@/components/guides/GuideImage";
import Breadcrumbs from "@/components/site/Breadcrumbs";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return { title: post.frontmatter.title, description: post.frontmatter.summary };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const { frontmatter, content } = post;

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
      <Breadcrumbs
        items={[{ label: "Blog", href: "/blog" }, { label: frontmatter.title, truncate: true }]}
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
        <MDXRemote source={content} components={blogMdxComponents} />
      </article>
    </main>
  );
}

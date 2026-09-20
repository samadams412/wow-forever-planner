import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPost } from "@/lib/blog";
import { blogMdxComponents } from "@/components/blog/mdx-components";
import GuideImage from "@/components/guides/GuideImage";
import Breadcrumbs from "@/components/site/Breadcrumbs";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

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

  // Get all posts and filter out the current one
  const otherPosts = getAllPosts().filter((p) => p.slug !== slug);

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

      <GuideImage src={frontmatter.heroImage} alt={frontmatter.heroAlt} credit={frontmatter.heroCredit} priority />

      <article>
        <MDXRemote source={content} components={blogMdxComponents} />
      </article>

      {/* Other Posts Section */}
      {otherPosts.length > 0 && (
        <section className="mt-12 border-t border-foreground/10 pt-8">
          <h2 className="font-heading text-lg font-medium text-foreground">Other Posts</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {otherPosts.slice(0, 2).map((other) => (
              <Link
                key={other.slug}
                href={`/blog/${other.slug}`}
                className="group flex items-center justify-between rounded-lg border border-foreground/10 p-4 transition-colors hover:border-accent/50 hover:bg-accent/5"
              >
                <span className="font-medium text-foreground group-hover:text-accent truncate">
                  {other.title}
                </span>
                <span className="text-sm text-foreground-muted/70 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2">
                  &rarr;
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
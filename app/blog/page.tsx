import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Dated posts on World of Warcraft: Forever beta impressions, patch breakdowns, and updates.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Blog</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        Dated posts -- beta impressions, patch breakdowns, and updates as Forever evolves.
      </p>

      {posts.length === 0 ? (
        <p className="mt-6 text-sm text-foreground-muted">No posts published yet -- check back soon.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent hover:bg-surface-hover"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="font-medium text-foreground">{post.title}</h2>
                <span className="text-xs text-foreground-muted/70">
                  {new Date(post.date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-foreground-muted">{post.summary}</p>
              {post.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
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

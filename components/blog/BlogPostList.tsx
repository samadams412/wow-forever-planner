"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type BlogListItem = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
};

const POSTS_PER_PAGE = 5;

// The list is prerendered (no server searchParams read), so the page number is
// read here on the client. The Suspense fallback renders page 1, which is what
// ends up in the static HTML.
function BlogPostListInner({ posts }: { posts: BlogListItem[] }) {
  const params = useSearchParams();
  const currentPage = Math.max(1, Number(params.get("page")) || 1);
  return <BlogPostListView posts={posts} currentPage={currentPage} />;
}

function BlogPostListView({ posts: allPosts, currentPage }: { posts: BlogListItem[]; currentPage: number }) {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);

  // Slice posts for the current page
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const posts = allPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  if (posts.length === 0) {
    return <p className="text-sm text-foreground-muted">No posts published yet -- check back soon.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="fx-standard-hover block rounded-lg border border-border bg-surface p-4"
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between border-t border-border pt-6">
          {currentPage > 1 ? (
            <Link
              href={`/blog?page=${currentPage - 1}`}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:bg-surface-hover"
            >
              &larr; Previous Page
            </Link>
          ) : (
            <div /> // Spacer to keep layout flex aligned
          )}

          <span className="text-xs text-foreground-muted">
            Page <strong className="text-foreground">{currentPage}</strong> of {totalPages}
          </span>

          {currentPage < totalPages ? (
            <Link
              href={`/blog?page=${currentPage + 1}`}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:bg-surface-hover"
            >
              Next Page &rarr;
            </Link>
          ) : (
            <div />
          )}
        </nav>
      )}
    </div>
  );
}

export default function BlogPostList({ posts }: { posts: BlogListItem[] }) {
  return (
    <Suspense fallback={<BlogPostListView posts={posts} currentPage={1} />}>
      <BlogPostListInner posts={posts} />
    </Suspense>
  );
}

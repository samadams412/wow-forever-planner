import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Dated posts on World of Warcraft: Forever beta impressions, patch breakdowns, and updates.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="w-full">
      <div className="relative flex min-h-64 items-end overflow-hidden px-6 py-10 sm:min-h-80 sm:py-14">
        {/* Official World of Warcraft: Forever zone press still, used with
            credit -- see the caption below. Same treatment as the guides
            hero: full-bleed image, warm color-grade, then a darkening
            gradient so the title/intro stay readable over it. */}
        <Image
          src="/images/blog/hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "50% 55%" }}
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
          <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            Blog
          </h1>
          <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            Dated posts -- beta impressions, patch breakdowns, and updates as Forever evolves.
          </p>
        </div>

        <p className="absolute inset-x-0 bottom-1.5 text-center text-[10px] text-foreground-muted/60">
          Image: Official World of Warcraft: Forever reveal screenshot, courtesy of Blizzard Entertainment
        </p>
      </div>

      <div className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
        {posts.length === 0 ? (
          <p className="text-sm text-foreground-muted">No posts published yet -- check back soon.</p>
        ) : (
          <div className="space-y-3">
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
      </div>
    </main>
  );
}

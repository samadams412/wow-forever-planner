import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAllPosts } from "@/lib/blog";
import BlogPostList from "@/components/blog/BlogPostList";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Dated posts on World of Warcraft: Forever beta impressions, patch breakdowns, and updates.",
};

export default function BlogPage() {
  const posts = getAllPosts().map(({ slug, title, date, summary, tags }) => ({ slug, title, date, summary, tags }));

  return (
    <main className="w-full">
      <div className="relative flex min-h-48 items-end overflow-hidden px-6 py-8 sm:min-h-64 sm:py-10">
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
          {/* hero-text-accent/hero-text-muted, not text-accent/
              text-foreground-muted -- this sits directly over the hero photo
              with only a text-shadow for legibility, so it can't repaint
              dark in Light mode the way plain body copy does. */}
          <h1 className="hero-text-accent font-heading text-2xl font-semibold tracking-wide [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            Blog
          </h1>
          <p className="hero-text-muted mt-2 max-w-[70ch] text-sm leading-relaxed [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            Dated posts -- beta impressions, patch breakdowns, and updates as Forever evolves.
          </p>
        </div>

        <p className="absolute inset-x-0 bottom-1.5 text-center text-[10px] text-foreground-muted/60">
          Image: Official World of Warcraft: Forever reveal screenshot, courtesy of Blizzard Entertainment
        </p>
      </div>

      <div className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
        <BlogPostList posts={posts} />
      </div>
    </main>
  );
}
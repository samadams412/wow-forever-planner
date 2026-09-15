import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Official World of Warcraft: Forever scenic screenshot, used with
          credit -- see the caption below. */}
      <Image
        src="/images/hero/404.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "50% 60%" }}
      />
      {/* Same dark vignette + gold color-grade treatment as the homepage
          hero, so a lost visitor still reads this as part of the site. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(201,169,97,0.1), rgba(13,11,7,0.1))",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(13,11,7,0.55) 0%, transparent 65%)",
            "linear-gradient(to bottom, rgba(13,11,7,0.2) 0%, transparent 25%, transparent 55%, rgba(13,11,7,0.35) 88%, var(--background) 100%)",
          ].join(", "),
        }}
      />

      <div className="relative flex w-full max-w-lg flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo/forevercraft-mark-carved.svg" alt="" className="h-12 w-12" />
        <h1 className="mt-4 font-heading text-6xl font-semibold tracking-wide text-accent">404</h1>
        <p className="mt-3 text-lg text-foreground">This path hasn&apos;t been charted.</p>
        <p className="mt-2 max-w-[45ch] text-sm text-foreground-muted">
          Whatever you were looking for isn&apos;t here -- wrong turn, an old link, or a page that
          hasn&apos;t been built yet.
        </p>

        <Link
          href="/"
          className="mt-7 inline-block rounded-lg bg-accent px-5 py-2.5 font-medium text-background transition-colors hover:bg-accent-hover"
          data-cursor="hearth"
        >
          Back to camp
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
          <Link href="/planner" className="hover:text-accent hover:underline">
            Planner
          </Link>
          <Link href="/reference" className="hover:text-accent hover:underline">
            Reference
          </Link>
          <Link href="/guides" className="hover:text-accent hover:underline">
            Guides
          </Link>
          <Link href="/blog" className="hover:text-accent hover:underline">
            Blog
          </Link>
        </div>
      </div>

      <p className="absolute inset-x-0 bottom-1.5 text-center text-[10px] text-foreground-muted/60">
        Image: Official World of Warcraft: Forever scenic screenshot, courtesy of Blizzard Entertainment
      </p>
    </main>
  );
}

import Link from "next/link";
import Image from "next/image";
import { GitBranch, BookOpen, Compass, PenLine } from "lucide-react";
import Card from "@/components/site/Card";
import LaunchCountdown from "@/components/site/LaunchCountdown";

const ICON_CLASS = "h-5 w-5 text-accent";

const links = [
  {
    href: "/planner",
    label: "Planner",
    description: "Pick a race and class, then plan your talent build.",
    icon: <GitBranch className={ICON_CLASS} />,
  },
  {
    href: "/reference",
    label: "Reference",
    description: "Racials and race/class rules at a glance.",
    icon: <BookOpen className={ICON_CLASS} />,
  },
  {
    href: "/guides",
    label: "Guides",
    description: "Leveling tips, class impressions, and patch breakdowns.",
    icon: <Compass className={ICON_CLASS} />,
  },
  {
    href: "/blog",
    label: "Blog",
    description: "Dated posts on beta impressions and updates.",
    icon: <PenLine className={ICON_CLASS} />,
  },
];

export default function Home() {
  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Official BlizzCon 2026 reveal cinematic still, used with credit --
          see the caption below. object-position is pinned left-of-center so
          the hunter-and-bear figures and the smoking peak both stay in frame
          on narrow/tall mobile crops, where cover scales to full height and
          crops the sides rather than the top/bottom. */}
      <Image
        src="/images/hero/homepage-hero.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "20% 45%" }}
      />
      {/* Warm gold/black color-grade so the photo reads as part of the site
          rather than a pasted-on screenshot. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(201,169,97,0.1), rgba(13,11,7,0.2))",
        }}
      />
      {/* Legibility gradient: transparent over the sky, darkening toward the
          edges and bottom so the countdown/title/cards stay readable without
          a hard box around them -- plus a soft vignette at the far corners. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 100% 60% at 50% 2%, transparent 0%, transparent 25%, rgba(13,11,7,0.6) 70%, rgba(13,11,7,0.8) 100%)",
            "linear-gradient(to bottom, rgba(13,11,7,0.35) 0%, transparent 12%, transparent 55%, rgba(13,11,7,0.6) 80%, var(--background) 100%)",
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.4) 100%)",
          ].join(", "),
        }}
      />

      <div className="relative w-full max-w-2xl">
        <LaunchCountdown />

        <div className="mt-6 flex items-center gap-3 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo/gold-talent-tree-transparent.svg"
            alt=""
            className="h-12 w-12 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] sm:h-14 sm:w-14"
          />
          <h1 className="hero-text-accent font-heading text-3xl font-semibold tracking-wide">Forevercraft</h1>
        </div>
        {/* hero-text-muted, not text-foreground-muted -- this sits directly
            over the hero photo with only a text-shadow (on the wrapping div
            above and this section's own overlays) for legibility, so it
            can't repaint dark in readable mode the way plain body copy does. */}
        <p className="hero-text-muted mt-2">
          A free, fan-made planner and guide hub for World of Warcraft:
          Forever.
        </p>
        <p className="hero-text-muted mt-2 text-sm">
          Tracking WoW Forever beta data as of Sept 13, 2026 · All classes fully built, other features in progress.
        </p>

        <div className="fx-featured fx-featured-hover mt-6 inline-block rounded-lg">
          {/* bg-surface-hover/85 on hover, not the opaque bg-surface-hover
              Card.tsx uses -- this button sits over the hero photo, so its
              hover state has to stay translucent same as its resting state
              instead of going solid. */}
          <Link
            href="/planner"
            className="relative flex items-center justify-center rounded-lg bg-surface/80 px-5 py-2.5 font-medium text-accent backdrop-blur-sm transition-colors hover:bg-surface-hover/85"
          >
            Start planning →
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <Card
              key={link.href}
              href={link.href}
              title={link.label}
              description={link.description}
              icon={link.icon}
            />
          ))}
        </div>
      </div>

      <p className="absolute inset-x-0 bottom-1.5 text-center text-[10px] text-foreground-muted/60">
        Image: Official World of Warcraft: Forever reveal cinematic, courtesy of Blizzard Entertainment
      </p>
    </main>
  );
}

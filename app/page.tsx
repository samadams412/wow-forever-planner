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
          <h1 className="font-heading text-3xl font-semibold tracking-wide text-accent">Forevercraft</h1>
        </div>
        <p className="mt-2 text-foreground-muted">
          A free, fan-made planner and guide hub for World of Warcraft:
          Forever.
        </p>
        <p className="mt-2 text-sm text-foreground-muted">
          Tracking WoW Forever beta data as of Sept 13, 2026 · All classes fully built, other features in progress.
        </p>

        <div className="group relative mt-6 inline-block overflow-hidden rounded-lg p-[1px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(201,169,97,0.2)]">
          {/* Rotating Shimmer Border Layer */}
          <span className="absolute inset-[-1000%] animate-border-spin bg-[conic-gradient(from_90deg_at_50%_50%,#3d3420_0%,#c9a961_25%,#ffeaac_50%,#c9a961_75%,#3d3420_100%)]" />

          {/* See-through Button Content matching Card style */}
          <Link
            href="/planner"
            className="relative flex items-center justify-center rounded-lg bg-surface/80 px-5 py-2.5 font-medium text-accent backdrop-blur-sm transition-colors group-hover:bg-surface-hover"
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

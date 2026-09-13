import Link from "next/link";
import Card from "@/components/site/Card";

const links = [
  {
    href: "/planner",
    label: "Planner",
    description: "Pick a race and class, then plan your talent build.",
  },
  {
    href: "/reference",
    label: "Reference",
    description: "Racials and race/class rules at a glance.",
  },
  {
    href: "/guides",
    label: "Guides",
    description: "Leveling tips, class impressions, and patch breakdowns.",
  },
  {
    href: "/blog",
    label: "Blog",
    description: "Dated posts on beta impressions and updates.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/forevercraft-mark-carved.svg" alt="" className="h-10 w-10" />
          <h1 className="font-heading text-3xl font-semibold tracking-wide text-accent">Forevercraft</h1>
        </div>
        <p className="mt-2 text-foreground-muted">
          A free, fan-made planner and guide hub for World of Warcraft:
          Forever.
        </p>
        <p className="mt-1 text-sm text-foreground-muted/70">
          Tracking WoW Forever beta data as of Sept 13, 2026 · Warrior fully built, other classes in progress.
        </p>

        <Link
          href="/planner"
          className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 font-medium text-background transition-colors hover:bg-accent-hover"
        >
          Start planning →
        </Link>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <Card key={link.href} href={link.href} title={link.label} description={link.description} />
          ))}
        </div>
      </div>
    </main>
  );
}

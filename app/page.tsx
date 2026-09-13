import Link from "next/link";

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
    <main className="flex-1 flex flex-col items-center px-6 py-16">
      <div className="max-w-2xl w-full">
        <h1 className="font-heading text-3xl font-semibold tracking-wide text-accent">Forevercraft</h1>
        <p className="mt-2 text-foreground-muted">
          A free, fan-made planner and guide hub for World of Warcraft:
          Forever.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-hover hover:border-accent"
            >
              <div className="font-medium text-foreground">{link.label}</div>
              <p className="mt-1 text-sm text-foreground-muted">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

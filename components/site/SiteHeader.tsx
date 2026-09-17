"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const NAV_LINKS: { href: string; label: string; children?: { href: string; label: string }[] }[] = [
  { href: "/planner", label: "Planner" },
  {
    href: "/reference",
    label: "Reference",
    children: [
      { href: "/reference/racials", label: "Racials" },
      { href: "/reference/legacy-perks", label: "Legacy Perks" },
      { href: "/reference/class-spellbooks", label: "Class Spellbooks" },
      { href: "/reference/dungeons", label: "Dungeon Level Ranges" },
      { href: "/reference/professions", label: "Professions" },
    ],
  },
  { href: "/guides", label: "Guides" },
  { href: "/blog", label: "Blog" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative border-b border-border bg-surface">
      <div
        className="pointer-events-none absolute inset-0"
        // style={{
        //   backgroundImage:
        //     "radial-gradient(480px 220px at 6% 0%, rgba(150,24,28,0.35), transparent 70%), radial-gradient(480px 220px at 94% 0%, rgba(20,88,158,0.35), transparent 70%)",
        // }}
      />
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          data-cursor="hearth"
          className="flex items-center gap-2 font-heading text-lg font-semibold tracking-wide text-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/forevercraft-mark-carved.svg" alt="" className="h-7 w-7" />
          Forevercraft
        </Link>
        <nav className="hidden items-center gap-5 sm:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const linkClass = `text-sm transition-colors ${
              active ? "font-medium text-accent" : "text-foreground-muted hover:text-foreground"
            }`;

            if (!link.children) {
              return (
                <Link key={link.href} href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              );
            }

            return (
              <div key={link.href} className="group relative">
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
                <div className="invisible absolute left-0 top-full z-20 w-52 pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg shadow-black/40">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-3 py-2 text-sm text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="text-foreground-muted hover:text-foreground sm:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <nav className="relative flex flex-col gap-3 border-t border-border px-4 py-3 sm:hidden">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <div key={link.href} className="flex flex-col gap-2">
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`text-sm transition-colors ${
                    active ? "font-medium text-accent" : "text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
                {link.children && (
                  <div className="flex flex-col gap-2 border-l border-border pl-3">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMenuOpen(false)}
                        className={`text-sm transition-colors ${
                          pathname === child.href
                            ? "font-medium text-accent"
                            : "text-foreground-muted hover:text-foreground"
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      )}
    </header>
  );
}

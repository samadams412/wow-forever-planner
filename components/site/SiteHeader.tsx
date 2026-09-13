"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/planner", label: "Planner" },
  { href: "/reference", label: "Reference" },
  { href: "/guides", label: "Guides" },
  { href: "/blog", label: "Blog" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative overflow-hidden border-b border-border bg-surface">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(480px 220px at 6% 0%, rgba(150,24,28,0.35), transparent 70%), radial-gradient(480px 220px at 94% 0%, rgba(20,88,158,0.35), transparent 70%)",
        }}
      />
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          data-cursor="hearth"
          className="flex items-center gap-2 font-heading text-lg font-semibold tracking-wide text-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/forevercraft-mark-carved.svg" alt="" className="h-7 w-7" />
          Forevercraft
        </Link>
        <nav className="hidden items-center gap-5 sm:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors ${
                  active
                    ? "font-medium text-accent"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
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
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`text-sm transition-colors ${
                  active
                    ? "font-medium text-accent"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}

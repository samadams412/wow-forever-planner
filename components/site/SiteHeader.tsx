"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

type SubNavLink = {
  href: string;
  label: string;
  icon?: string;
};

type NavLink = {
  href: string;
  label: string;
  children?: SubNavLink[];
};

const NAV_LINKS: NavLink[] = [
  { href: "/planner", label: "Planner" },
  {
    href: "/reference",
    label: "Reference",
    children: [
      { href: "/reference/racials", label: "Racials", icon: "https://wow.zamimg.com/images/wow/icons/large/spell_nature_bloodlust.jpg" },
      { href: "/reference/legacy-perks", label: "Legacy Perks", icon: "https://wow.zamimg.com/images/wow/icons/medium/inv_misc_book_09.jpg" },
      { href: "/reference/class-spellbooks", label: "Class Spellbooks", icon: "https://wow.zamimg.com/images/wow/icons/medium/inv_misc_book_11.jpg" },
      { href: "/reference/dungeons", label: "Dungeon Level Ranges", icon: "https://wow.zamimg.com/images/wow/icons/medium/inv_misc_key_03.jpg" },
      { href: "/reference/dungeons/loot", label: "Dungeon Loot", icon: "https://wow.zamimg.com/images/wow/icons/medium/inv_misc_bag_10.jpg" },
      { href: "/reference/professions", label: "Professions", icon: "https://wow.zamimg.com/images/wow/icons/medium/trade_engineering.jpg" },
      { href: "/reference/items", label: "Items", icon: "https://wow.zamimg.com/images/wow/icons/medium/inv_misc_gem_01.jpg" },
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
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          data-cursor="hearth"
          className="flex items-center gap-2 font-heading text-lg font-semibold tracking-wide text-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/gold-talent-tree-transparent.svg" alt="" className="h-7 w-7" />
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
                <div className="invisible absolute left-0 top-full z-20 w-56 pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg shadow-black/40">
                    {link.children.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-surface-hover hover:text-foreground ${
                            childActive ? "font-medium text-accent" : "text-foreground-muted"
                          }`}
                        >
                          {child.icon && (
                            <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded border border-border/50 bg-surface-muted">
                              <Image
                                src={child.icon}
                                alt=""
                                width={20}
                                height={20}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
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
                  <div className="flex flex-col gap-2.5 border-l border-border pl-3">
                    {link.children.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-2.5 text-sm transition-colors ${
                            childActive ? "font-medium text-accent" : "text-foreground-muted hover:text-foreground"
                          }`}
                        >
                          {child.icon && (
                            <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded border border-border/50 bg-surface-muted">
                              <Image
                                src={child.icon}
                                alt=""
                                width={20}
                                height={20}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
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
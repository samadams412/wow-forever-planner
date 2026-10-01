"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import BossPortrait from "@/components/reference/BossPortrait";

export type JumpNavEntry = { id: string; label: string; portraitUrl?: string | null; iconSrc?: string };

// Highlights whichever section's top has most recently scrolled past the
// viewport's upper third -- IntersectionObserver rather than a scroll
// listener, so this stays cheap on long loot pages (30+ boss/quest anchors
// on some dungeons).
export default function DungeonJumpNav({ entries }: { entries: JumpNavEntry[] }) {
  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null);
  const visibleIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const elements = entries
      .map((e) => document.getElementById(e.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (observedEntries) => {
        for (const entry of observedEntries) {
          if (entry.isIntersecting) visibleIds.current.add(entry.target.id);
          else visibleIds.current.delete(entry.target.id);
        }
        const firstVisible = entries.find((e) => visibleIds.current.has(e.id));
        if (firstVisible) setActiveId(firstVisible.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <nav aria-label="Jump to section">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">On this page</h2>
      <ul className="scrollbar-gold mt-1 max-h-60 cursor-default overflow-y-auto rounded border border-border">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className={`flex items-center gap-2 border-b border-border/50 px-2 py-1.5 text-sm last:border-b-0 hover:bg-surface-hover ${
                activeId === entry.id ? "bg-accent/20 text-accent" : "text-foreground-muted"
              }`}
            >
              {entry.portraitUrl !== undefined && <BossPortrait src={entry.portraitUrl} alt="" size={20} />}
              {entry.iconSrc && (
                <Image src={entry.iconSrc} alt="" width={16} height={16} className="shrink-0" />
              )}
              {entry.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

"use client";

import { useState } from "react";

// foreverchanges.pro's own NPC portrait renders -- hotlinked, not mirrored,
// same discipline as this site's wow.zamimg.com icon hotlinks. Not every
// boss has one (trash-mob groupings, lootable objects, wowtbc-sourced
// bosses), and a display id occasionally not resolving on their end is a
// real possibility -- render nothing rather than a broken-image icon.
export default function BossPortrait({ src, alt, size = 40 }: { src: string | null; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-full border border-border/60 bg-surface object-cover"
      onError={() => setFailed(true)}
    />
  );
}

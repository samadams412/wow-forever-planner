// Item and icon display helpers, client-safe (no data imports), so client
// components can use them without pulling lib/wow-data.ts's talent data into
// the bundle. lib/wow-data.ts re-exports all of these.

export function iconUrl(icon: string): string {
  return `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;
}

export function mediumIconUrl(icon: string): string {
  return `https://wow.zamimg.com/images/wow/icons/medium/${icon}.jpg`;
}

// Standard Blizzard item-quality colors (0 Poor - 5 Legendary), same values
// the in-game tooltip and every armory-style site use -- not something this
// site invented, so hardcoding the 6 values here rather than deriving them.
// Common (1) is the one exception: it's plain white, which only works
// in-game because the trade window is always dark. Routed through the
// --quality-common CSS custom property (app/globals.css) instead of a
// literal "#ffffff" so it can flip to a dark color under Light mode --
// every other quality's color is intentionally NOT theme-aware, since
// those are readable on both this site's dark and light surfaces and are
// meant to match the game's fixed palette exactly.
export const ITEM_QUALITY_COLOR: Record<number, string> = {
  0: "#9d9d9d",
  1: "var(--quality-common)",
  2: "#1eff00",
  3: "#0070dd",
  4: "#a335ee",
  5: "#ff8000",
  // Artifact -- above Legendary, reserved in-game for a handful of unique
  // items (the Warglaives/Twin Blades of Azzinoth, Atiesh-style items).
  // Confirmed present in this catalog (10 items, e.g. both Warglaives of
  // Azzinoth) rather than added speculatively.
  6: "#e6cc80",
};

export function itemQualityColor(quality: number | null | undefined): string {
  if (quality === null || quality === undefined) return ITEM_QUALITY_COLOR[1];
  return ITEM_QUALITY_COLOR[quality] ?? ITEM_QUALITY_COLOR[1];
}

export const ITEM_QUALITY_NAME: Record<number, string> = {
  0: "Poor",
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Epic",
  5: "Legendary",
  6: "Artifact",
};

export function itemQualityName(quality: number | null | undefined): string {
  if (quality === null || quality === undefined) return "Unknown";
  return ITEM_QUALITY_NAME[quality] ?? "Unknown";
}

// Color per boss-ability tag, so the abilities list is scannable at a glance.
// Tags are foreverchanges' own flags (see scripts/extract-foreverchanges-
// dungeon-maps.js). Grouped by what the player has to do about the ability:
//   - who it targets: Tank / Healers / Damage dealers
//   - reactive: Can be interrupted
//   - the kind of effect: Magic effect, Curse, Poison, Disease, Bleed, Enrage
//   - how bad it is: Important, Deadly
// Each family shares a hue, so a glance tells you the category even when
// the word itself is unfamiliar.
//
// Full class strings, not built from parts, so Tailwind's scanner sees them.
// Unknown flags fall back to the neutral muted style.

const NEUTRAL = "border-foreground-muted/40 bg-foreground-muted/10 text-foreground-muted";

const TAG_STYLE: Record<string, string> = {
  // Targeting -- blue/green/orange
  Tank: "border-[#4a90d9]/60 bg-[#4a90d9]/15 text-[#8ab8ef]",
  Healers: "border-[#3fb950]/60 bg-[#3fb950]/15 text-[#7fd68e]",
  "Damage dealers": "border-[#e0823d]/60 bg-[#e0823d]/15 text-[#f0a46f]",
  // Reactive -- cyan
  "Can be interrupted": "border-[#3cc4c4]/60 bg-[#3cc4c4]/15 text-[#7adcdc]",
  // Effect type -- purple / violet / lime / olive / crimson / orange-red
  "Magic effect": "border-[#a371f7]/60 bg-[#a371f7]/15 text-[#c4a4fa]",
  Curse: "border-[#8b5cf6]/60 bg-[#8b5cf6]/15 text-[#b29bf8]",
  Poison: "border-[#84cc16]/60 bg-[#84cc16]/15 text-[#b5e05a]",
  Disease: "border-[#a3a63d]/60 bg-[#a3a63d]/15 text-[#c9cb6a]",
  Bleed: "border-[#dc2626]/60 bg-[#dc2626]/15 text-[#f07070]",
  Enrage: "border-[#f97316]/60 bg-[#f97316]/15 text-[#fb9d55]",
  // Severity -- gold (site accent) / red
  Important: "border-accent/60 bg-accent/15 text-accent",
  Deadly: "border-[#ef4444]/70 bg-[#ef4444]/20 text-[#ff8080]",
};

export function abilityTagClass(flag: string): string {
  return TAG_STYLE[flag] ?? NEUTRAL;
}

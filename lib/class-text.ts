// Dark outline for text in a WoW class color (CLASS_COLOR in lib/wow-data.ts).
// Priest's white, Rogue's pale yellow and Mage's light blue have no
// guaranteed contrast in Light mode; see ClassHero.tsx for the reasoning.
// Client-safe on its own so pages that can't import lib/wow-data can use it.
export const CLASS_TEXT_SHADOW = [
  "-1px -1px 2px rgba(0,0,0,0.9)",
  "1px -1px 2px rgba(0,0,0,0.9)",
  "-1px 1px 2px rgba(0,0,0,0.9)",
  "1px 1px 2px rgba(0,0,0,0.9)",
  "0 0 5px rgba(0,0,0,0.6)",
].join(", ");

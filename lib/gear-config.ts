// Gear planner level settings. Level is a parameter everywhere (pools, base
// stats, presets are keyed by it); adding level 60 is adding it here plus
// its data, not a rewrite. Client-safe, no imports.

export const GEAR_LEVELS = [30] as const;
export type GearLevel = (typeof GEAR_LEVELS)[number];
export const DEFAULT_GEAR_LEVEL: GearLevel = 30;

// Highest profession skill a character of `level` can have trained, from the
// Classic rank level gates (Journeyman 10, Expert 20, Artisan 35). Caps which
// enchants a preset assumes are available at that level.
export function maxProfessionSkill(level: number): number {
  if (level >= 35) return 300;
  if (level >= 20) return 225;
  if (level >= 10) return 150;
  if (level >= 5) return 75;
  return 0;
}

// Classes with a /gear/<classId> page (and a public/gear/<level>/<class>.json
// pool). Staged: Warrior first, the rest once its UI settles.
export const GEAR_PLANNER_CLASSES = ["warrior"] as const;

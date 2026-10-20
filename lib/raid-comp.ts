// Raid comp planner core: the spec list, roster shape and pure helpers.
// Client-safe (no Node built-ins) and deliberately free of lib/wow-data,
// which would pull every talent file into the client bundle: the server
// page resolves icons/colors into SpecView and passes them down.

export const GROUP_COUNT = 8;
export const GROUP_SIZE = 5;
export const ROSTER_SIZE = GROUP_COUNT * GROUP_SIZE;
export const MAX_NAME_LENGTH = 12; // WoW character names cap at 12 letters

export type Spec = {
  /** 1-based position in SPECS; 0 means an empty slot. */
  index: number;
  classId: string;
  /** Talent tree name exactly as in data/talents/<classId>.json. */
  tree: string;
};

// FROZEN ORDER: a spec's position here is its share-link digit, so never
// reorder or remove entries. A renamed tree just changes `tree` in place;
// new specs append to the end. lib/raid-comp.test.ts checks every `tree`
// still exists in the talent data.
const SPEC_ORDER: [string, string][] = [
  ["warrior", "Arms"], ["warrior", "Fury"], ["warrior", "Protection"],
  ["paladin", "Holy"], ["paladin", "Protection"], ["paladin", "Retribution"],
  ["hunter", "Beast Mastery"], ["hunter", "Marksmanship"], ["hunter", "Survival"],
  ["rogue", "Assassination"], ["rogue", "Combat"], ["rogue", "Subtlety"],
  ["priest", "Discipline"], ["priest", "Holy"], ["priest", "Shadow"],
  ["shaman", "Elemental"], ["shaman", "Enhancement"], ["shaman", "Restoration"],
  ["mage", "Arcane"], ["mage", "Fire"], ["mage", "Frost"],
  ["warlock", "Affliction"], ["warlock", "Demonology"], ["warlock", "Destruction"],
  ["druid", "Balance"], ["druid", "Feral Combat"], ["druid", "Restoration"],
];

export const SPECS: Spec[] = SPEC_ORDER.map(([classId, tree], i) => ({ index: i + 1, classId, tree }));

export function getSpec(index: number): Spec | undefined {
  return index > 0 ? SPECS[index - 1] : undefined;
}

/** A Spec plus display fields resolved on the server (icon is a full URL). */
export type SpecView = Spec & { label: string; className: string; color: string; icon: string };

/** One spec index per slot (0 = empty), length ROSTER_SIZE. */
export type Roster = number[];

export function emptyRoster(): Roster {
  return Array(ROSTER_SIZE).fill(0);
}

export function emptyNames(): string[] {
  return Array(ROSTER_SIZE).fill("");
}

/** Swap two slots' contents (spec and name together). */
export function swapSlots<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

// ---------------------------------------------------------------------------
// Buff/debuff coverage (data/raid-buffs.json, resolved by lib/raid-buffs.ts)

export type Confidence = "confirmed" | "datamined" | "estimated";
export type EffectScope = "raid" | "group" | "target" | "enemy";

export type EffectSourceView = {
  classId: string;
  /** SPECS indexes that provide it ("all" in the data = the class's 3 specs). */
  specIndexes: number[];
  /** "All Paladins" / "Retribution Paladin". */
  label: string;
  confidence: Confidence;
  note?: string;
};

export type EffectView = {
  id: string;
  name: string;
  kind: "buff" | "debuff";
  scope: EffectScope;
  summary: string;
  confidence: Confidence;
  note?: string;
  /** Full icon URL of the first source's spell/talent. */
  icon: string;
  /** The first source's Forever tooltip text (top rank). */
  text: string;
  raidSpell?: string;
  onlyOneCounts?: string;
  perCaster?: string;
  sources: EffectSourceView[];
};

export type EffectSet = { id: string; label: string; confidence: Confidence; note: string; classId?: string };

export type EffectCoverage = {
  /** Roster slots whose spec can provide this effect. */
  providers: number[];
  covered: boolean;
  /** Group-scope effects only: 0-based groups that have it. */
  groups: number[];
};

export type PerCasterShortfall = {
  setId: string;
  label: string;
  className: string;
  casters: number;
  effects: number;
  /** 0-based group for a group-scope set (auras, water totems); null = raid-wide. */
  group: number | null;
  confidence: Confidence;
};

export const groupOf = (slot: number) => Math.floor(slot / GROUP_SIZE);

export function computeCoverage(roster: Roster, effects: EffectView[]): Record<string, EffectCoverage> {
  const out: Record<string, EffectCoverage> = {};
  for (const e of effects) {
    const specSet = new Set(e.sources.flatMap((s) => s.specIndexes));
    const providers = roster.flatMap((spec, slot) => (spec && specSet.has(spec) ? [slot] : []));
    const groups = e.scope === "group" ? [...new Set(providers.map(groupOf))].sort((a, b) => a - b) : [];
    out[e.id] = { providers, covered: providers.length > 0, groups };
  }
  return out;
}

// One-at-a-time-per-caster sets (Blessings, Auras, Curses, air/water
// totems, pet abilities): the roster can show every effect in the set as
// covered while having fewer casters than effects. Flags those cases.
// Raid-wide sets compare the raid's casters of that class with how many of
// the set's effects the roster covers; group-scope sets do the same inside
// each group, since an Aura or water totem only reaches its own group.
export function perCasterShortfalls(
  roster: Roster,
  effects: EffectView[],
  coverage: Record<string, EffectCoverage>,
  sets: EffectSet[],
  classNames: Record<string, string>,
): PerCasterShortfall[] {
  const out: PerCasterShortfall[] = [];
  for (const set of sets) {
    if (!set.classId) continue;
    const members = effects.filter((e) => e.perCaster === set.id);
    if (members.length === 0) continue;
    const casterSlots = roster.flatMap((spec, slot) => (getSpec(spec)?.classId === set.classId ? [slot] : []));
    const base = { setId: set.id, label: set.label, className: classNames[set.classId], confidence: set.confidence };
    if (members[0].scope === "group") {
      for (let g = 0; g < GROUP_COUNT; g++) {
        const casters = casterSlots.filter((s) => groupOf(s) === g).length;
        const effectCount = members.filter((e) => coverage[e.id].groups.includes(g)).length;
        if (casters > 0 && casters < effectCount) out.push({ ...base, casters, effects: effectCount, group: g });
      }
    } else {
      const effectCount = members.filter((e) => coverage[e.id].covered).length;
      if (casterSlots.length > 0 && casterSlots.length < effectCount) {
        out.push({ ...base, casters: casterSlots.length, effects: effectCount, group: null });
      }
    }
  }
  return out;
}

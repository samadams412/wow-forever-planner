// Raid comp planner core: the spec list, roster shape and pure helpers.
// Client-safe (no Node built-ins) and deliberately free of lib/wow-data,
// which would pull every talent file into the client bundle: the server
// page resolves icons/colors into SpecView and passes them down.

export const GROUP_COUNT = 8;
export const GROUP_SIZE = 5;
export const ROSTER_SIZE = GROUP_COUNT * GROUP_SIZE;
export const MAX_NAME_LENGTH = 12; // WoW character names cap at 12 letters

/** "flex" = Feral Druid, counted as both a possible tank and DPS. */
export type Role = "tank" | "healer" | "dps" | "flex";

export type Spec = {
  /** 1-based position in SPECS; 0 means an empty slot. */
  index: number;
  classId: string;
  /** Talent tree name exactly as in data/talents/<classId>.json. */
  tree: string;
  role: Role;
};

// FROZEN ORDER: a spec's position here is its share-link digit, so never
// reorder or remove entries. A renamed tree just changes `tree` in place;
// new specs append to the end. lib/raid-comp.test.ts checks every `tree`
// still exists in the talent data.
// Roles are the spec's usual raid job, a planning default, not a rule.
const SPEC_ORDER: [string, string, Role][] = [
  ["warrior", "Arms", "dps"], ["warrior", "Fury", "dps"], ["warrior", "Protection", "tank"],
  ["paladin", "Holy", "healer"], ["paladin", "Protection", "tank"], ["paladin", "Retribution", "dps"],
  ["hunter", "Beast Mastery", "dps"], ["hunter", "Marksmanship", "dps"], ["hunter", "Survival", "dps"],
  ["rogue", "Assassination", "dps"], ["rogue", "Combat", "dps"], ["rogue", "Subtlety", "dps"],
  ["priest", "Discipline", "healer"], ["priest", "Holy", "healer"], ["priest", "Shadow", "dps"],
  ["shaman", "Elemental", "dps"], ["shaman", "Enhancement", "dps"], ["shaman", "Restoration", "healer"],
  ["mage", "Arcane", "dps"], ["mage", "Fire", "dps"], ["mage", "Frost", "dps"],
  ["warlock", "Affliction", "dps"], ["warlock", "Demonology", "dps"], ["warlock", "Destruction", "dps"],
  ["druid", "Balance", "dps"], ["druid", "Feral Combat", "flex"], ["druid", "Restoration", "healer"],
];

export const SPECS: Spec[] = SPEC_ORDER.map(([classId, tree, role], i) => ({ index: i + 1, classId, tree, role }));

export function getSpec(index: number): Spec | undefined {
  return index > 0 ? SPECS[index - 1] : undefined;
}

/** A Spec plus display fields resolved on the server (icon is a full URL). */
export type SpecView = Spec & { label: string; className: string; color: string; icon: string };

export type RoleCounts = { tank: number; healer: number; dps: number; flex: number; players: number };

export function roleCounts(roster: Roster): RoleCounts {
  const c: RoleCounts = { tank: 0, healer: 0, dps: 0, flex: 0, players: 0 };
  for (const idx of roster) {
    const spec = getSpec(idx);
    if (!spec) continue;
    c[spec.role]++;
    c.players++;
  }
  return c;
}

// Soft hints only, from a rule of thumb: Classic-era 40-player raids ran
// roughly one healer per 4-5 players. Silent below 10 players, where a
// roster is still being filled in.
export const HEALER_SHARE_HINT = 0.2;

export function roleHints(c: RoleCounts): string[] {
  if (c.players < 10) return [];
  const hints: string[] = [];
  if (c.tank + c.flex === 0) hints.push("No tanks yet.");
  if (c.healer / c.players < HEALER_SHARE_HINT) {
    hints.push(
      `Looks light on healing: ${c.healer} healer${c.healer === 1 ? "" : "s"} for ${c.players} players. Raids usually bring about 1 healer per 4 to 5 players.`,
    );
  }
  return hints;
}

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

// ---------------------------------------------------------------------------
// Share URL: /raid-comp?r=1-<one base36 char per slot>&n=<names>
//
// `r` is the roster, same idea as lib/build-code.ts: a leading version
// segment, then one base36 digit per slot (0 = empty, 1..27 = SPECS index)
// in slot order, trailing empties trimmed. A full raid is 42 chars. Bump
// ROSTER_CODE_VERSION (and branch in decodeRoster) if SPECS ever has to
// change in a way that isn't a pure append.
// `n` is the slot names, each percent-encoded, joined by "~", trailing
// empties trimmed. "~" is stripped from names, so it can't collide.
// Both are omitted when empty, so a blank planner is a bare /raid-comp.

export const ROSTER_CODE_VERSION = 1;
const NAME_SEPARATOR = "~";

export const cleanName = (name: string) => name.replaceAll(NAME_SEPARATOR, "").slice(0, MAX_NAME_LENGTH);

const trimTrailing = <T>(list: T[], isEmpty: (v: T) => boolean): T[] => {
  let end = list.length;
  while (end > 0 && isEmpty(list[end - 1])) end--;
  return list.slice(0, end);
};

export function encodeRoster(roster: Roster): string | null {
  const digits = trimTrailing(roster, (v) => v === 0);
  return digits.length ? `${ROSTER_CODE_VERSION}-${digits.map((v) => v.toString(36)).join("")}` : null;
}

export function encodeNames(names: string[]): string | null {
  const kept = trimTrailing(names.map(cleanName), (v) => v === "");
  return kept.length ? kept.map((n) => encodeURIComponent(n)).join(NAME_SEPARATOR) : null;
}

/** Query string (with "?") for the current state, or "" when empty. */
export function rosterQuery(roster: Roster, names: string[]): string {
  const r = encodeRoster(roster);
  const n = encodeNames(names);
  const parts = [r && `r=${r}`, n && `n=${n}`].filter(Boolean);
  return parts.length ? `?${parts.join("&")}` : "";
}

/** Unknown version or malformed code = empty roster (never throws). */
export function decodeRoster(code: string | null): Roster {
  const roster = emptyRoster();
  const m = code?.match(/^(\d+)-([0-9a-z]*)$/i);
  if (!m || Number(m[1]) !== ROSTER_CODE_VERSION) return roster;
  [...m[2].toLowerCase()].slice(0, ROSTER_SIZE).forEach((ch, i) => {
    const v = parseInt(ch, 36);
    roster[i] = v <= SPECS.length ? v : 0;
  });
  return roster;
}

/** `value` is the already percent-decoded param (URLSearchParams.get). */
export function decodeNames(value: string | null): string[] {
  const names = emptyNames();
  (value ?? "").split(NAME_SEPARATOR).slice(0, ROSTER_SIZE).forEach((n, i) => (names[i] = n.slice(0, MAX_NAME_LENGTH)));
  return names;
}

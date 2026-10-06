import spellbooksData from "@/data/spellbooks.json";
import classRacialsData from "@/data/class-racials.json";

// "New in Forever" abilities for a class.
//
// A spell counts as new only when every rank is marked `classicStatus: "new"`
// in data/spellbooks.json. A spell whose early ranks are new but whose later
// ranks changed (Holy Shock, Slam, Trueshot Aura, Curse of the Elements,
// Conflagrate) is a changed spell, not a new one. Race-specific spells from
// class-racials.json are excluded: they are racial bonuses, not class abilities.
//
// Level and text come from rank 1; the spellbook tab (e.g. "Arcane", "Elemental")
// is the tag, the same tag talentsforever shows on each card.
export type NewAbility = {
  name: string;
  icon: string;
  level: number;
  tab: string;
  description: string;
};

type SpellbookRank = { level: number; description: string; classicStatus?: string };
type SpellbookSpell = { name: string; icon: string; ranks?: SpellbookRank[] };
type SpellbookClass = { tabs: { name: string; spells: SpellbookSpell[] }[] };

const CLASSES = (spellbooksData as { classes: Record<string, SpellbookClass> }).classes;

const RACIAL_SPELL_NAMES = new Map<string, Set<string>>(
  Object.entries(classRacialsData as Record<string, { races: Record<string, { name: string }[]> }>).map(
    ([cls, body]) => [
      cls.toLowerCase(),
      new Set(Object.values(body.races).flat().map((s) => s.name)),
    ]
  )
);

// Spells the spellbook data does not carry as new. Comprehend Scroll lives in the
// General tab, which build-spellbooks.js preserves from old data without ranks,
// so its "new" status is taken from the 2026-10-04 snapshot's spell_desc entry
// (cs "new", "Learned at level 6").
const EXTRA_NEW: Record<string, NewAbility[]> = {
  mage: [
    {
      name: "Comprehend Scroll",
      icon: "inv_scroll_03",
      level: 6,
      tab: "General",
      description: "Decipher an untranslated scroll.",
    },
  ],
};

export function getNewAbilities(classId: string): NewAbility[] {
  const key = classId.toLowerCase();
  const book = CLASSES[key];
  const racial = RACIAL_SPELL_NAMES.get(key) ?? new Set<string>();
  const out: NewAbility[] = [];
  for (const tab of book?.tabs ?? []) {
    for (const spell of tab.spells) {
      const ranks = spell.ranks ?? [];
      if (ranks.length === 0 || racial.has(spell.name)) continue;
      if (!ranks.every((r) => r.classicStatus === "new")) continue;
      const rank = ranks[0];
      out.push({ name: spell.name, icon: spell.icon, level: rank.level, tab: tab.name, description: rank.description });
    }
  }
  out.push(...(EXTRA_NEW[key] ?? []));
  return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

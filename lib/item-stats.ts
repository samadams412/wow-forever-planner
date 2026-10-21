// Tooltip -> stats parser for data/items.json records (gear planner data
// layer). Pure and dependency-free so build scripts can require() it
// directly under Node's type stripping (keep it to erasable TS: no enums).
//
// Every tooltip line lands in exactly one bucket: a stat, weapon/armor
// numbers, item meta (binding, requirements, slot line, flavor text...), a
// set bonus, an effect we don't model as a stat (procs, Use:, conditional
// or ability-specific Equip: lines), or `unparsed`. `unparsed` is what the
// coverage report (scripts/report-item-stat-coverage.js) counts as failure.

export const STAT_KEYS = [
  "str", "agi", "sta", "int", "spi",
  "ap", "rap", "apFeral",
  "critRating", "hitRating", "hasteRating", "expertiseRating",
  "critPct", "hitPct",
  "sp", "spellDmg", "heal",
  "holyDmg", "fireDmg", "frostDmg", "shadowDmg", "natureDmg", "arcaneDmg",
  "spellCritPct", "spellHitPct", "spellPen",
  "mp5", "hp5",
  "bonusArmor", "defRating", "defSkill", "dodgeRating", "dodgePct",
  "parryRating", "parryPct", "blockRating", "blockPct", "blockValue",
  "fireRes", "frostRes", "shadowRes", "natureRes", "arcaneRes", "allRes",
] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Partial<Record<StatKey, number>>;

export type WeaponDamage = { min: number; max: number; school: string | null };

export type ParsedItem = {
  stats: Stats;
  armor: number;
  weapon: { damage: WeaponDamage[]; speed: number | null; dps: number | null } | null;
  classes: string[] | null;
  races: string[] | null;
  unique: boolean;
  // Non-level requirements (profession skill, reputation), verbatim.
  requires: string[];
  setName: string | null;
  setBonuses: string[];
  effects: string[];
  unparsed: string[];
};

// "+N <name>" lines (green stats, resistances, bonus armor).
const PLUS_STATS: Record<string, StatKey> = {
  Strength: "str", Agility: "agi", Stamina: "sta", Intellect: "int", Spirit: "spi",
  Armor: "bonusArmor",
  "Fire Resistance": "fireRes", "Frost Resistance": "frostRes", "Shadow Resistance": "shadowRes",
  "Nature Resistance": "natureRes", "Arcane Resistance": "arcaneRes", "All Resistances": "allRes",
};

// Forever-format "Equip: +N <name>" lines.
const EQUIP_PLUS_STATS: Record<string, StatKey> = {
  "Spell Power": "sp", "Spell Damage": "spellDmg", Healing: "heal",
  "Holy Spell Damage": "holyDmg", "Fire Spell Damage": "fireDmg", "Frost Spell Damage": "frostDmg",
  "Shadow Spell Damage": "shadowDmg", "Nature Spell Damage": "natureDmg", "Arcane Spell Damage": "arcaneDmg",
  "Attack Power": "ap", "Ranged Attack Power": "rap", "ranged Attack Power": "rap",
  "Attack Power in Cat, Bear, and Dire Bear forms only": "apFeral",
  "Attack Power in Cat, Bear, Dire Bear, and Moonkin forms only": "apFeral",
  "Critical Strike Rating": "critRating", "Hit Rating": "hitRating", "Haste Rating": "hasteRating",
  "Expertise Rating": "expertiseRating",
  "Mana Regeneration": "mp5", "Health Regeneration": "hp5", "Spell Penetration": "spellPen",
  "Defense Rating": "defRating", "Dodge Rating": "dodgeRating", "Parry Rating": "parryRating",
  "Block Rating": "blockRating", "Block Value": "blockValue", Armor: "bonusArmor",
};

const SCHOOL_KEY: Record<string, StatKey> = {
  Holy: "holyDmg", Fire: "fireDmg", Frost: "frostDmg", Shadow: "shadowDmg", Nature: "natureDmg", Arcane: "arcaneDmg",
};

// Classic-format Equip: phrasings that are plain stats.
const EQUIP_PHRASES: [RegExp, StatKey | ((m: RegExpMatchArray) => StatKey)][] = [
  [/^Equip: Increases damage and healing done by magical spells and effects by up to (\d+)\.$/, "sp"],
  [/^Equip: Increases healing done by spells and effects by up to (\d+)\.$/, "heal"],
  [/^Equip: Increases damage done by (Holy|Fire|Frost|Shadow|Nature|Arcane) spells and effects by up to (\d+)\.$/, (m) => SCHOOL_KEY[m[1]]],
  [/^Equip: Restores (\d+) mana per 5 sec\.$/i, "mp5"],
  [/^Equip: Restores (\d+) health per 5 sec\.$/i, "hp5"],
  [/^Equip: Improves your chance to get a critical strike by (\d+)%\.$/, "critPct"],
  [/^Equip: Improves your chance to get a critical strike with spells by (\d+)%\.$/, "spellCritPct"],
  [/^Equip: Improves your chance to hit by (\d+)%\.$/, "hitPct"],
  [/^Equip: Improves your chance to hit with spells by (\d+)%\.$/, "spellHitPct"],
  [/^Equip: Increased Defense \+(\d+)\.$/, "defSkill"],
  [/^Equip: Increases your chance to dodge an attack by (\d+)%\.$/, "dodgePct"],
  [/^Equip: Increases your chance to parry an attack by (\d+)%\.$/, "parryPct"],
  [/^Equip: Increases your chance to block attacks with a shield by (\d+)%\.$/, "blockPct"],
  [/^Equip: Increases the block value of your shield by (\d+)\.$/, "blockValue"],
  [/^Equip: Decreases the magical resistances of your spell targets by (\d+)\.$/, "spellPen"],
];

const SLOT_WORDS =
  "Head|Neck|Shoulder|Back|Chest|Shirt|Tabard|Wrist|Hands|Waist|Legs|Feet|Finger|Trinket|" +
  "Main Hand|Off Hand|One-Hand|Two-Hand|Held In Off-hand|Ranged|Thrown|Relic|Projectile|Ammo|Bag";
const SLOT_LINE = new RegExp(`^(${SLOT_WORDS})(\\t.+)?$`);

const META: RegExp[] = [
  /^Binds (when|on) /, /^Soulbound$/, /^Quest Item$/, /^Conjured Item$/, /^Locked$/, /^This Item Begins a Quest$/,
  /^Requires Level \d+$/, /^Sell Price: /, /^Durability \d+ \/ \d+$/, /^\d+ Charges?$/,
  /^".*"$/, /^<.*>$/, SLOT_LINE,
];

const num = (s: string) => Number(s);

function add(stats: Stats, key: StatKey, value: number) {
  stats[key] = (stats[key] ?? 0) + value;
}

export function parseItemTooltip(lines: readonly string[]): ParsedItem {
  const out: ParsedItem = {
    stats: {}, armor: 0, weapon: null, classes: null, races: null, unique: false,
    requires: [], setName: null, setBonuses: [], effects: [], unparsed: [],
  };
  const weapon = () => (out.weapon ??= { damage: [], speed: null, dps: null });

  for (const raw of lines) {
    // A leading tab is the category line of a non-equipment item ("\tPotions").
    if (raw.startsWith("\t")) continue;
    const line = raw.trim();
    if (!line) continue;
    let m: RegExpMatchArray | null;

    // Placeholder weapons ("Damage set by hand\tSpeed 1.50") have no damage;
    // keep the speed so the coverage report flags the missing damage.
    if ((m = line.match(/^Damage set by hand\tSpeed (\d+(?:\.\d+)?)$/))) { weapon().speed = num(m[1]); continue; }

    if ((m = line.match(/^(\d+) Armor$/))) { out.armor += num(m[1]); continue; }
    // A shield's "N Block" line is its block value.
    if ((m = line.match(/^(\d+) Block$/))) { add(out.stats, "blockValue", num(m[1])); continue; }
    if ((m = line.match(/^(\d+)(?: - (\d+))?(?: (\w+))? Damage\tSpeed (\d+(?:\.\d+)?)$/))) {
      const w = weapon();
      w.damage.push({ min: num(m[1]), max: num(m[2] ?? m[1]), school: m[3] ?? null });
      w.speed = num(m[4]);
      continue;
    }
    // Bonus elemental damage on a weapon, e.g. "+1 - 5 Frost Damage".
    if ((m = line.match(/^\+(\d+) - (\d+) (\w+) Damage$/))) {
      weapon().damage.push({ min: num(m[1]), max: num(m[2]), school: m[3] });
      continue;
    }
    if ((m = line.match(/^\((\d+(?:\.\d+)?) damage per second\)$/))) { weapon().dps = num(m[1]); continue; }

    if ((m = line.match(/^([+-]\d+) (.+)$/)) && PLUS_STATS[m[2]]) { add(out.stats, PLUS_STATS[m[2]], num(m[1])); continue; }
    if ((m = line.match(/^Equip: ([+-]\d+) (.+?)\.?$/)) && EQUIP_PLUS_STATS[m[2]]) {
      add(out.stats, EQUIP_PLUS_STATS[m[2]], num(m[1]));
      continue;
    }
    const phrase = EQUIP_PHRASES.find(([re]) => re.test(line));
    if (phrase) {
      const pm = line.match(phrase[0])!;
      const key = typeof phrase[1] === "function" ? phrase[1](pm) : phrase[1];
      add(out.stats, key, num(pm[pm.length - 1]));
      continue;
    }

    if ((m = line.match(/^Classes: (.+)$/))) { out.classes = m[1].split(", "); continue; }
    if ((m = line.match(/^Races: (.+)$/))) { out.races = m[1].split(", "); continue; }
    if (/^Unique(-Equipped)?( ?\(\d+\)|: .+)?$/.test(line)) { out.unique = true; continue; }
    if (/^Requires (?!Level \d+$)/.test(line)) { out.requires.push(line); continue; }
    if (/^\(\d+\) Set: /.test(line)) { out.setBonuses.push(line); continue; }
    if ((m = line.match(/^(.+) \(\d+\/\d+\)$/))) { out.setName = m[1]; continue; }
    if (META.some((re) => re.test(line))) continue;
    // Not a plain stat: procs, on-use, conditional or ability-specific
    // bonuses ("Attack Power when fighting Undead", "Run speed increased").
    if (/^(Equip|Use|Chance on hit): /.test(line) || /^When struck in combat/.test(line)) {
      out.effects.push(line);
      continue;
    }
    out.unparsed.push(line);
  }
  return out;
}

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
  // "Unique-Equipped: Rune of Battle (1)": items sharing a group can't be worn together beyond the count.
  uniqueGroup: string | null;
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

// --- Permanent enchants -----------------------------------------------------
// Enchant scrolls, armor kits, scopes and blacksmith attachments describe
// their bonus in prose on a "Use:" line ("Permanently enchant bracers to give
// +3 Strength."). parseEnchantText turns that into the same Stats shape.

export type ParsedEnchant = {
  // Catalog slot strings (data/items.json `slot`) the enchant applies to.
  slots: string[];
  // Item subtypes (data/items.json `type`) it's limited to, or null for any.
  types: string[] | null;
  stats: Stats;
  armor: number;
  weaponDamage: number;
  minIlvl: number;
  // The text, when part of the bonus is a proc or utility we don't score.
  effect: string | null;
  // Numbers left in the text after extraction: a phrasing the parser missed.
  leftover: string | null;
};

const ANY_MELEE = ["One-Hand", "Main Hand", "Two-Hand", "Off Hand"];
const ENCHANT_TARGETS: [RegExp, string[], string[] | null][] = [
  [/item worn on the chest, legs,? hands,? or feet/i, ["Chest", "Legs", "Hands", "Feet"], null],
  [/leg or head slot item/i, ["Head", "Legs"], null],
  [/shoulder slot item/i, ["Shoulder"], null],
  [/(two-handed|2H|\dH) (melee )?weapon/i, ["Two-Hand"], null],
  [/two-handed sword, mace, axe or polearm/i, ["Two-Hand"], ["Sword", "Mace", "Axe", "Polearm"]],
  [/bow, gun, or crossbow/i, ["Ranged"], ["Bow", "Gun", "Crossbow"]],
  [/bow or gun/i, ["Ranged"], ["Bow", "Gun"]],
  [/(melee )?weapon/i, ANY_MELEE, null],
  [/bracers?\b/i, ["Wrist"], null],
  [/chest armor/i, ["Chest"], null],
  [/cloak/i, ["Back"], null],
  [/boots/i, ["Feet"], null],
  [/gloves/i, ["Hands"], null],
  [/shield/i, ["Shield"], null],
  [/necklace/i, ["Neck"], null],
  [/off-hand/i, ["Held In Off-hand"], null],
];

const PRIMARY: Record<string, StatKey> = {
  strength: "str", agility: "agi", stamina: "sta", intellect: "int", spirit: "spi",
  "spell power": "sp", "attack power": "ap", defense: "defSkill", "defense skill": "defSkill",
};
const RES: Record<string, StatKey> = {
  fire: "fireRes", frost: "frostRes", shadow: "shadowRes", nature: "natureRes", arcane: "arcaneRes",
};
const SCHOOL: Record<string, StatKey> = {
  holy: "holyDmg", fire: "fireDmg", frost: "frostDmg", shadow: "shadowDmg", nature: "natureDmg", arcane: "arcaneDmg",
};
const PRIMARY_NAMES = "strength|agility|stamina|intellect|spirit|spell power|attack power|defense skill|defense";

// Order matters: each match is cut out of the text before the next runs, so
// compound phrasings are claimed before the simpler ones inside them.
type Extract = (m: RegExpMatchArray, e: ParsedEnchant) => void;
const ENCHANT_EXTRACTORS: [RegExp, Extract][] = [
  [/only usable on items level (\d+) and above\.?/i, (m, e) => { e.minIlvl = num(m[1]); }],
  [/\+?(\d+) to all stats|all stats by (\d+)/i, (m, e) => { for (const k of ["str", "agi", "sta", "int", "spi"] as const) add(e.stats, k, num(m[1] ?? m[2])); }],
  [/healing (?:spells )?by up to (\d+) and (?:the effects of your )?(?:spell )?damage(?: spells)? by up to (\d+)/i, (m, e) => { add(e.stats, "heal", num(m[1])); add(e.stats, "spellDmg", num(m[2])); }],
  [/up to (\d+) points of healing to healing spells and up to (\d+) points of damage to damage spells/i, (m, e) => { add(e.stats, "heal", num(m[1])); add(e.stats, "spellDmg", num(m[2])); }],
  [/up to (\d+) damage to spells and up to (\d+) points of healing to healing spells/i, (m, e) => { add(e.stats, "spellDmg", num(m[1])); add(e.stats, "heal", num(m[2])); }],
  [/healing spells by up to (\d+) and damage spells by up to (\d+)/i, (m, e) => { add(e.stats, "heal", num(m[1])); add(e.stats, "spellDmg", num(m[2])); }],
  [/(?:spell )?damage and healing by up to (\d+)/i, (m, e) => add(e.stats, "sp", num(m[1]))],
  [/up to (\d+) points of healing to healing spells|healing spells by up to (\d+)/i, (m, e) => add(e.stats, "heal", num(m[1] ?? m[2]))],
  [/up to (\d+) damage to spells/i, (m, e) => add(e.stats, "spellDmg", num(m[1]))],
  [/(holy|fire|frost|shadow|nature|arcane) damage by up to (\d+)/i, (m, e) => add(e.stats, SCHOOL[m[1].toLowerCase()], num(m[2]))],
  [/up to (\d+) additional (holy|fire|frost|shadow|nature|arcane) damage when casting \2 spells/i, (m, e) => add(e.stats, SCHOOL[m[2].toLowerCase()], num(m[1]))],
  [/(\d+) to all resistances|resistance to all schools of magic by (\d+)/i, (m, e) => add(e.stats, "allRes", num(m[1] ?? m[2]))],
  [/\+?(\d+) (fire|frost|shadow|nature|arcane) resistance/i, (m, e) => add(e.stats, RES[m[2].toLowerCase()], num(m[1]))],
  [/resistance to (fire|frost|shadow|nature|arcane) by (\d+)/i, (m, e) => add(e.stats, RES[m[1].toLowerCase()], num(m[2]))],
  [/restore (\d+) mana every 5 seconds/i, (m, e) => add(e.stats, "mp5", num(m[1]))],
  [/\+?(\d+)% chance to block/i, (m, e) => add(e.stats, "blockPct", num(m[1]))],
  [/(\d+)% chance to dodge/i, (m, e) => add(e.stats, "dodgePct", num(m[1]))],
  [/(\d+)% critical strike chance|critical strike chance by (\d+)%/i, (m, e) => add(e.stats, "critPct", num(m[1] ?? m[2]))],
  [/chance to hit by (\d+)%/i, (m, e) => add(e.stats, "hitPct", num(m[1]))],
  [/defense value of an item worn on the chest, legs,? hands,? or feet by (\d+)/i, (m, e) => add(e.stats, "defSkill", num(m[1]))],
  [/(\d+) additional armor|armor(?: value)? by (\d+)|its armor by (\d+)/i, (m, e) => { e.armor += num(m[1] ?? m[2] ?? m[3]); }],
  [new RegExp(`(?:wearer's |the )?(${PRIMARY_NAMES})(?: value)?(?: of the (?:wearer|bearer))?(?: is increased)? by (\\d+)`, "i"), (m, e) => add(e.stats, PRIMARY[m[1].toLowerCase()], num(m[2]))],
  [new RegExp(`\\+?(\\d+) (?:to )?(${PRIMARY_NAMES})\\b`, "i"), (m, e) => add(e.stats, PRIMARY[m[2].toLowerCase()], num(m[1]))],
  [/(?:do )?\+?(\d+) additional points? of damage\.?$|do \+(\d+) damage\.?$|increases its damage by (\d+)\.?$/i, (m, e) => { e.weaponDamage += num(m[1] ?? m[2] ?? m[3]); }],
];

export function parseEnchantText(useLine: string): ParsedEnchant {
  const text = useLine.replace(/^Use: /, "");
  const target = ENCHANT_TARGETS.find(([re]) => re.test(text));
  const e: ParsedEnchant = {
    slots: target ? [...target[1]] : [], types: target?.[2] ? [...target[2]] : null,
    stats: {}, armor: 0, weaponDamage: 0, minIlvl: 0, effect: null, leftover: null,
  };
  // A proc ("often when attacking... increases Strength by 100 for 15 sec")
  // grants its numbers only while active: unscored effect, no stats.
  if (/\b(often|sometimes|have a chance|has a chance|chance of|trigger|when you|when (striking|attacking|struck))\b/i.test(text)) {
    e.effect = text;
    return e;
  }
  let rest = text.replace(/\b\dH\b/g, "");
  for (const [re, apply] of ENCHANT_EXTRACTORS) {
    const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    rest = rest.replace(global, (...args) => {
      apply(args.slice(0, -2) as unknown as RegExpMatchArray, e);
      return " ";
    });
  }
  const scored = Object.keys(e.stats).length > 0 || e.armor > 0 || e.weaponDamage > 0;
  // Unscored remainder: a proc, a utility bonus, or a damage bonus limited to
  // one creature type. Kept as text so the planner can still show it.
  if (!scored || /\b(often|chance|sometimes|trigger|when|against|to (Beasts|Demons|Elementals|Undead)|speed|threat|stealth|skill|disarm|spike|faster|mounted)\b/i.test(rest))
    e.effect = text;
  const nums = rest.match(/\d+/g);
  if (scored && nums) e.leftover = rest.trim();
  return e;
}

export function parseItemTooltip(lines: readonly string[]): ParsedItem {
  const out: ParsedItem = {
    stats: {}, armor: 0, weapon: null, classes: null, races: null, unique: false, uniqueGroup: null,
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
    if ((m = line.match(/^Unique(?:-Equipped)?(?: ?\(\d+\)|: (.+?)(?: \(\d+\))?)?$/))) {
      out.unique = true;
      out.uniqueGroup = m[1] ?? null;
      continue;
    }
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

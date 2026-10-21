// Where and from what level each item can be obtained, for the gear
// planner's build scripts (presets now, the per-level item pool next).
//
// Many Forever quest rewards and dungeon drops carry no "Requires Level"
// line (requiredLevel 0), so the tooltip alone can't say an item is
// out of reach at level 30. Each known source gives a level and factions:
//   quest reward     quest requiredLevel (data/quests/index.json), quest side,
//                    quest requiredClasses
//   dungeon loot     dungeon levelMin, dungeon faction (data/dungeons/*.json),
//   dungeon quest    quest minLevel and faction
//   crafted          the level that profession skill is trainable at
//   capital vendor   that city's faction only
//   other sources    foreverchanges sources.json (world drop, vendor, crafted,
//                    mob...): no level of their own
// fromLevel = max(requiredLevel, earliest source level). A source with no
// level counts as requiredLevel, or itemLevel - 5 (the usual Classic gap)
// when that is 0 too. Items with no known source get null.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const readJson = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), "utf8"));
const SIDE = { Alliance: ["a"], Horde: ["h"], Both: ["a", "h"] };
const CAPITAL_SIDE = { "Stormwind City": "a", Ironforge: "a", Darnassus: "a", Orgrimmar: "h", "Thunder Bluff": "h", Undercity: "h" };
const { maxProfessionSkill } = require("../../lib/gear-config.ts");
const levelForSkill = (skill) => {
  for (let level = 1; level <= 60; level++) if (maxProfessionSkill(level) >= skill) return level;
  return null;
};

function loadAvailability() {
  const sources = new Map(); // itemId -> [{ level: number|null, sides: string[], classes: string[]|null, kind }]
  const push = (itemId, src) => {
    if (!sources.has(itemId)) sources.set(itemId, []);
    sources.get(itemId).push(src);
  };

  for (const q of readJson("data", "quests", "index.json").quests)
    for (const r of [...(q.choiceRewards ?? []), ...(q.guaranteedRewards ?? [])])
      if (r.itemId) push(r.itemId, { kind: "quest", level: q.requiredLevel ?? null, sides: SIDE[q.side] ?? ["a", "h"], classes: q.requiredClasses?.length ? q.requiredClasses : null });

  for (const f of fs.readdirSync(path.join(ROOT, "data", "dungeons")).filter((f) => f.endsWith(".json"))) {
    const d = readJson("data", "dungeons", f);
    const sides = SIDE[d.faction] ?? ["a", "h"];
    for (const b of d.bosses ?? []) for (const i of b.items ?? []) push(i.itemId, { kind: "dungeon", level: d.levelMin ?? null, sides, classes: null });
    for (const q of d.quests ?? [])
      for (const i of q.rewards ?? []) push(i.itemId, { kind: "dungeon-quest", level: q.minLevel ?? d.levelMin ?? null, sides: SIDE[q.faction] ?? sides, classes: null });
  }

  // sources.json kinds: q/Q quest, B boss, m mob, w world drop, v vendor, C
  // crafted, R reputation. Its quest entries carry no faction, so they only
  // count when the quest index above doesn't already know the item's quests.
  for (const [id, [kind, what, where]] of Object.entries(readJson("data", "sources", "foreverchanges", "items", "sources.json").items)) {
    const itemId = Number(id);
    if ((kind === "q" || kind === "Q") && sources.get(itemId)?.some((s) => s.kind === "quest" || s.kind === "dungeon-quest")) continue;
    // A crafted item exists once a crafter has the skill ("Engineering (210)"):
    // the rank's level gate, not itemLevel - 5 (Net-o-Matic: ilvl 42, skill 210, level 20).
    const skill = kind === "C" ? Number(/\((\d+)\)/.exec(what ?? "")?.[1] ?? NaN) : NaN;
    // A vendor in one capital ("Orgrimmar, in Classic") sells to that city's faction only
    // (Insignia of the Horde vs of the Alliance); a vendor spread over zones sells to both.
    const city = kind === "v" ? CAPITAL_SIDE[/^([^,]+),/.exec(where ?? "")?.[1]] : undefined;
    push(itemId, { kind: "other", level: Number.isNaN(skill) ? null : levelForSkill(skill), sides: city ? [city] : ["a", "h"], classes: null });
  }

  // -> { fromLevel, sides: Set, classes: Set|null } | null (no known source)
  return function availability(item) {
    const list = sources.get(item.itemId);
    if (!list) return null;
    const req = item.requiredLevel ?? 0;
    const fallback = req > 0 ? req : Math.max(1, (item.itemLevel ?? 1) - 5);
    const fromLevel = Math.max(req, Math.min(...list.map((s) => s.level ?? fallback)));
    const sides = new Set(list.flatMap((s) => s.sides));
    // Class-locked only when every source is a class-locked quest.
    const classes = list.every((s) => s.classes) ? new Set(list.flatMap((s) => s.classes)) : null;
    return { fromLevel, sides, classes };
  };
}

module.exports = { loadAvailability };

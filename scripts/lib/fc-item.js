// Shared foreverchanges.pro raw-item -> LootItem mapping, used by both
// build-dungeons.js (boss loot + quest reward enrichment) and
// build-items.js (the full /reference/items catalog) so the two never
// drift apart on what a "unified" item looks like.

// foreverchanges' item tooltip lines (x/y) hold slot+type combined as one
// tab-separated line (e.g. "Wrist\tCloth", "Main Hand\tDagger") -- pull the
// "type" half out of it (armor material / weapon subclass).
function deriveTypeFromTooltip(lines) {
  if (!Array.isArray(lines)) return null;
  for (const line of lines) {
    if (typeof line === "string" && line.includes("\t")) {
      const parts = line.split("\t");
      return parts[1]?.trim() || null;
    }
  }
  return null;
}

// c (item class) + u (item subclass) -> the exact category label
// foreverchanges.pro's own per-item pages display for that combo (e.g.
// "7:9" -> "Herb", "4:1" -> "Cloth"). These are Blizzard's own stable
// item-class/subclass ids, not beta data that drifts, so there are only 81
// distinct combos across the whole 21,458-item catalog -- built once by
// scripts/build-item-category-labels.js (fetches one representative item
// per combo from the live site; see that script's header for why this
// can't be derived from the bulk same.json/new.json/etc. exports, which
// never carry it). Loaded lazily so modules that don't need it (most
// callers of this file) don't pay a sync fs.readFileSync at require time.
let _categoryLabels = null;
function loadCategoryLabels() {
  if (_categoryLabels === null) {
    const fs = require("fs");
    const path = require("path");
    const labelsPath = path.join(__dirname, "..", "..", "data", "sources", "item-category-labels.json");
    _categoryLabels = JSON.parse(fs.readFileSync(labelsPath, "utf8"));
  }
  return _categoryLabels;
}

function categoryLabelFor(raw) {
  if (raw.c === undefined || raw.u === undefined) return null;
  const entry = loadCategoryLabels()[`${raw.c}:${raw.u}`];
  return entry?.subclassLabel ?? null;
}

// foreverchanges' "same" (unchanged-from-Classic) items never carry full
// tooltip text (x) at the source -- only new/changed/missing do (see build-
// items.js's header comment). They DO still carry real structured fields
// though: slot (s), class restriction (o), weapon speed/dps (p/d), required
// level (r), and item class/subclass (c/u, see categoryLabelFor above).
// Reconstruct a tooltip from those, in the exact same line format/order
// real x-array items use (cross-checked against real weapon entries, e.g.
// "58 - 108 Damage\tSpeed 2.10" / "(39.5 damage per second)" / "Classes:
// Mage" / "Requires Level 49"), so it renders through the same TooltipLine
// styling with no separate code path -- but this is reconstructed, not the
// beta client's own rendered text (no damage range, armor value, or stat
// bonuses are derivable from these fields), so callers should treat a
// synthesized tooltip's absence of those lines as "not available" rather
// than "the item has none".
function buildSyntheticTooltip(raw) {
  const lines = [];
  const categoryLabel = categoryLabelFor(raw);
  if (raw.s) {
    // Equippable item: real WoW tooltips show "Slot\tSubclass" as one line
    // (e.g. "Legs\tCloth", "Two-Hand\tAxe") -- confirmed against
    // foreverchanges' own rendering, which pairs these as two spans on one
    // line, not two separate lines.
    lines.push(`${raw.s}\t${categoryLabel ?? ""}`);
  } else if (categoryLabel) {
    // Non-equippable item (consumable, trade goods, recipe, quest item,
    // container, quiver, key, misc): no slot, so the category label is its
    // own plain line (e.g. "Herb", "Potions", "Book").
    lines.push(categoryLabel);
  }
  if (raw.o) lines.push(`Classes: ${raw.o}`);
  if (raw.p !== undefined && raw.d !== undefined) {
    lines.push(`\tSpeed ${raw.p.toFixed(2)}`);
    lines.push(`(${raw.d} damage per second)`);
  }
  if (raw.r && raw.r > 1) lines.push(`Requires Level ${raw.r}`);
  return lines.length ? lines : null;
}

function fcItemToUnified(raw) {
  const synthesized = !raw.x;
  return {
    name: raw.n,
    slot: raw.s ?? null,
    type: raw.x ? deriveTypeFromTooltip(raw.x) : categoryLabelFor(raw),
    itemId: raw.i ?? null,
    icon: raw.k ?? null,
    quality: raw.q ?? null,
    itemLevel: raw.l ?? null,
    requiredLevel: raw.r ?? null,
    tooltip: raw.x ?? buildSyntheticTooltip(raw),
    tooltipSynthesized: synthesized,
    classicTooltip: raw.y ?? null,
    status: raw.t ?? null,
    dropChance: null,
    dropChanceUnder: false,
    unknown: false,
    source: "foreverchanges",
  };
}

module.exports = { deriveTypeFromTooltip, buildSyntheticTooltip, fcItemToUnified };

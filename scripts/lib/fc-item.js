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
    const labelsPath = path.join(__dirname, "..", "..", "data", "sources", "foreverchanges", "item-category-labels.json");
    _categoryLabels = JSON.parse(fs.readFileSync(labelsPath, "utf8"));
  }
  return _categoryLabels;
}

function categoryLabelFor(raw) {
  if (raw.c === undefined || raw.u === undefined) return null;
  const entry = loadCategoryLabels()[`${raw.c}:${raw.u}`];
  return entry?.subclassLabel ?? null;
}

// Scoped, one-time enrichment for "same"-status items actually referenced
// somewhere on the site (profession recipes/reagents, dungeon quest
// rewards -- NOT boss loot, which already gets full tooltip text from a
// richer per-dungeon source file) whose bulk same.json record has no real
// tooltip text. Pulled by scripts/fetch-referenced-item-tooltips.js
// (per-item live page scrape, same technique as the dungeon quest pull)
// rather than re-fetching all 9,813 "same" items site-wide. Following this
// project's "immutable dated snapshot" convention for data/sources/, a
// re-run writes a NEW dated file instead of overwriting an old one, so
// every item-tooltip-overlay-*.json is merged here (later date wins on a
// conflicting id) rather than reading just one hardcoded filename.
let _tooltipOverlay = null;
function loadTooltipOverlay() {
  if (_tooltipOverlay === null) {
    const fs = require("fs");
    const path = require("path");
    const sourcesDir = path.join(__dirname, "..", "..", "data", "sources", "foreverchanges");
    const overlayFiles = fs
      .readdirSync(sourcesDir)
      .filter((f) => /^item-tooltip-overlay-\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort(); // lexical sort on the date prefix = chronological
    const merged = {};
    for (const file of overlayFiles) {
      Object.assign(merged, JSON.parse(fs.readFileSync(path.join(sourcesDir, file), "utf8")));
    }
    _tooltipOverlay = merged;
  }
  return _tooltipOverlay;
}

function overlayTooltipFor(raw) {
  if (raw.i === undefined) return null;
  return loadTooltipOverlay()[raw.i] ?? null;
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
  const overlayTooltip = raw.x ? null : overlayTooltipFor(raw);
  const tooltip = raw.x ?? overlayTooltip ?? buildSyntheticTooltip(raw);
  // Real text either way once an overlay hit is available -- overlayTooltip
  // is scraped straight off the item's own live page, not reconstructed
  // from structured fields, so it gets the same "not synthesized" treatment
  // raw.x does (no "reconstructed, not the beta client's own text"
  // disclosure needed).
  const synthesized = !raw.x && !overlayTooltip;
  // deriveTypeFromTooltip only extracts from a "Slot\tType" tab-line
  // (equippable items). A non-equippable item's real tooltip (whether from
  // raw.x or the overlay) shows its type as a flat line instead (e.g. a
  // bag's "10 Slot Bag" comes after "Binds when picked up"/"Unique" flag
  // lines, none of them tab-separated) -- categoryLabelFor is always a safe
  // fallback there, since it's sourced from the same real per-item pages.
  const type = deriveTypeFromTooltip(tooltip) ?? categoryLabelFor(raw);
  return {
    name: raw.n,
    slot: raw.s ?? null,
    type,
    // Blizzard's own stable item-class id (raw.c -- Weapon/Armor/Container/
    // etc, see lib/wow-data.ts's ITEM_CLASS_NAME for the full map), not to
    // be confused with `type` above, which is the finer-grained subclass
    // label ("Cloth", "Axe", "Herb"). Distinct from itemId/quality/etc in
    // never being reconstructed or overlaid -- every raw record carries it
    // directly, foreverchanges' bulk exports included.
    itemClass: raw.c ?? null,
    itemId: raw.i ?? null,
    icon: raw.k ?? null,
    quality: raw.q ?? null,
    itemLevel: raw.l ?? null,
    requiredLevel: raw.r ?? null,
    tooltip,
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

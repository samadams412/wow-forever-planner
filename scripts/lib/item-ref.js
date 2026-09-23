// Shared item-reference helpers used by every profession build script
// (build-professions.js, build-gathering-professions.js) -- extracted from
// build-professions.js so a second pipeline with the same "wrap an item
// (or its absence) as the shape LootItemPill expects" need doesn't
// duplicate it.

// Full LootItem shape (see lib/dungeon-loot.ts), not a slim {id, icon,
// quality, name} ref -- every item on this site renders through the one
// shared LootItemPill component, so it needs the same shape everything
// else gives that component: full tooltip text (or the synthesized one
// for "same"-status items), status, dropChance/unknown (always null/false
// here -- profession data has no drop-table concept).
function itemRef(item) {
  if (!item) return null;
  return {
    name: item.name,
    slot: item.slot,
    type: item.type,
    itemId: item.itemId,
    icon: item.icon,
    quality: item.quality,
    itemLevel: item.itemLevel,
    requiredLevel: item.requiredLevel,
    tooltip: item.tooltip,
    tooltipSynthesized: item.tooltipSynthesized,
    classicTooltip: item.classicTooltip,
    status: item.status,
    dropChance: null,
    dropChanceUnder: false,
    unknown: false,
    source: "foreverchanges",
  };
}

// Same shape itemRef() produces, for a name that didn't resolve against the
// item catalog at all -- `unknown: true` is the existing site-wide
// convention LootItemPill already renders for this (muted italic text, no
// icon, no link), same treatment wowtbc-sourced "not yet discovered" items
// get elsewhere.
function unresolvedItemRef(name) {
  return {
    name,
    slot: null,
    type: null,
    itemId: null,
    icon: null,
    quality: null,
    itemLevel: null,
    requiredLevel: null,
    tooltip: null,
    tooltipSynthesized: false,
    classicTooltip: null,
    status: null,
    dropChance: null,
    dropChanceUnder: false,
    unknown: true,
    source: "foreverchanges",
  };
}

// Several foreverchanges.pro scrapes (camp milestones, gathering nodes/
// leveling/smelting) come with a real item URL already (".../item/271627"),
// unlike recipe/reagent names elsewhere in this pipeline -- resolve by id,
// not name, per this project's own "prefer an id join over a name guess
// when an id is available" convention (see the quest-reward-enrichment
// precedent in build-dungeons.js).
function itemIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/item\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// itemIdFromUrl + byId lookup + itemRef/unresolvedItemRef fallback, the
// single most common pattern across every id-based resolution site.
function resolveItemByUrl(byId, url, fallbackName) {
  const id = itemIdFromUrl(url);
  const item = id !== null ? byId.get(id) : null;
  return itemRef(item) || unresolvedItemRef(fallbackName);
}

module.exports = { itemRef, unresolvedItemRef, itemIdFromUrl, resolveItemByUrl };

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

function fcItemToUnified(raw) {
  return {
    name: raw.n,
    slot: raw.s ?? null,
    type: deriveTypeFromTooltip(raw.x),
    itemId: raw.i ?? null,
    icon: raw.k ?? null,
    quality: raw.q ?? null,
    itemLevel: raw.l ?? null,
    requiredLevel: raw.r ?? null,
    tooltip: raw.x ?? null,
    classicTooltip: raw.y ?? null,
    status: raw.t ?? null,
    dropChance: null,
    dropChanceUnder: false,
    unknown: false,
    source: "foreverchanges",
  };
}

module.exports = { deriveTypeFromTooltip, fcItemToUnified };

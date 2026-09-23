// Resolves a profession recipe's crafted-item name or a reagent's name
// against the full item catalog (data/items.json, see lib/items.ts) by
// exact name match -- data/professions/*.json has no item ids at all, only
// names, so this is the only join available. 99.84% of the ~9,400 names
// across all 8 professions resolve this way (checked directly before
// trusting it); the rest (mostly enchant spell effects with no physical
// item, e.g. "Enchant 2H Weapon - Strength") are left unresolved rather
// than guessed at.
//
// Recipe/reagent names sometimes carry a trailing "x2"/"x3"/"x200" with no
// space (e.g. "Fire Oilx2", "Crafted Light Shotx200") -- a scrape artifact
// meaning "this craft yields N of the item", not part of the name. Strip it
// before lookup and surface the count separately as `makesQty` /
// reagent quantity is unaffected (it's the ingredient count, already
// "Nx Name" with a space in the source data).

function buildNameIndex(items) {
  const byName = new Map();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, item);
  }
  return byName;
}

function resolveItemByName(byName, rawName) {
  const direct = byName.get(rawName.trim().toLowerCase());
  if (direct) return { item: direct, makesQty: null, cleanName: rawName.trim() };
  const m = rawName.match(/^(.+?)x(\d+)$/);
  if (m) {
    const stripped = m[1].trim();
    const item = byName.get(stripped.toLowerCase());
    if (item) return { item, makesQty: Number(m[2]), cleanName: stripped };
  }
  return { item: null, makesQty: null, cleanName: rawName.replace(/x\d+$/, "").trim() };
}

// "2x Silverleaf" -> { qty: 2, name: "Silverleaf" }. No count prefix means 1.
function parseReagentText(raw) {
  const m = raw.match(/^(\d+)x\s+(.+)$/);
  if (!m) return { qty: 1, name: raw.trim() };
  return { qty: Number(m[1]), name: m[2].trim() };
}

module.exports = { buildNameIndex, resolveItemByName, parseReagentText };

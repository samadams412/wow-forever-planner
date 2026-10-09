// Loads data/sources/foreverchanges/items/known-duplicate-ids.json -- hand-
// confirmed cases of foreverchanges.pro issuing a new item id for something
// that's actually the same item we already have under an older id (see that
// file's _readme for the full story and how an entry gets added to it).
//
// Two consumers:
//   - build-items.js / build-dungeons.js: drop every raw record whose id is
//     a key here before it reaches data/items.json or a dungeon's item
//     index, so a known-duplicate id can never shadow the canonical id in
//     the profession-recipe name resolver (scripts/lib/
//     profession-item-resolver.js) or anywhere else that joins by name.
//   - diff-foreverchanges-items.js: recognizes a key here as already
//     resolved, so a future pull that still contains that id doesn't get
//     re-reported as Added/Changed every time.

const fs = require("fs");
const path = require("path");

const DUPLICATES_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "sources",
  "foreverchanges",
  "items",
  "known-duplicate-ids.json"
);

let _duplicates = null;
function loadKnownDuplicateIds() {
  if (_duplicates === null) {
    const raw = JSON.parse(fs.readFileSync(DUPLICATES_PATH, "utf8"));
    _duplicates = new Map();
    for (const [id, info] of Object.entries(raw)) {
      if (id === "_readme") continue;
      _duplicates.set(Number(id), info);
    }
  }
  return _duplicates;
}

function isKnownDuplicateId(id) {
  return loadKnownDuplicateIds().has(id);
}

function canonicalIdFor(id) {
  return loadKnownDuplicateIds().get(id)?.canonicalId ?? null;
}

module.exports = { loadKnownDuplicateIds, isKnownDuplicateId, canonicalIdFor };

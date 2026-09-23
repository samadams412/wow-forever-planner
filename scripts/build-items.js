#!/usr/bin/env node
// Normalizes foreverchanges.pro's full item catalog (data/sources/
// foreverchanges_items/{new,changed,same,missing}.json -- the same source
// build-dungeons.js already reads for quest-reward enrichment) into one
// flat data/items.json for the /reference/items page. Each entry comes out
// in the exact same LootItem shape dungeon loot already uses (lib/
// dungeon-loot.ts) via the same fcItemToUnified mapping build-dungeons.js
// uses, so /reference/items can reuse LootItemPill directly rather than a
// second tooltip implementation.
//
// "same" (unchanged-from-Classic) entries never carry tooltip text (x) at
// the source -- only new/changed/missing do (foreverchanges' own item page
// only bothers storing full tooltip text where something is worth
// verifying). That's a real gap in the source, not something to paper over
// here: those rows render with a slot/type-only tooltip on the reference
// page, same as any other "unknown" item elsewhere on this site.

const fs = require("fs");
const path = require("path");
const { fcItemToUnified } = require("./lib/fc-item");

const ROOT = path.join(__dirname, "..");
const ITEMS_DIR = path.join(ROOT, "data", "sources", "foreverchanges_items");
const OUT_FILE = path.join(ROOT, "data", "items.json");

function main() {
  const items = [];
  for (const file of ["new.json", "changed.json", "same.json", "missing.json"]) {
    const p = path.join(ITEMS_DIR, file);
    if (!fs.existsSync(p)) continue;
    const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
    for (const raw of parsed.items) {
      const unified = fcItemToUnified(raw);
      // new.json carries a 7-item "rebuilt" outlier (t: "rebuilt") --
      // Classic items foreverchanges rebuilt under a new item id.
      // foreverchanges' own site groups these into its "New in Forever"
      // tab (5,335 = 5,328 new + 7 rebuilt) rather than giving them a
      // fourth tab, so fold them into "new" here too -- not fabricating a
      // status, just matching the grouping the source itself uses.
      if (unified.status === "rebuilt") unified.status = "new";
      items.push(unified);
    }
  }

  // No pretty-printing here, unlike data/dungeons/*.json -- at 21,458
  // entries this is purely machine-generated/machine-read (never hand-
  // edited), and indenting would roughly double an already-large file for
  // no benefit.
  fs.writeFileSync(OUT_FILE, JSON.stringify({ items }));

  const counts = { new: 0, changed: 0, same: 0, missing: 0 };
  for (const item of items) if (item.status && counts[item.status] !== undefined) counts[item.status]++;
  console.log(`${items.length} items written to ${path.relative(ROOT, OUT_FILE)}`);
  console.log(counts);
}

main();

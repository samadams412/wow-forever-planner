// One-time, scoped re-fetch: data/sources/foreverchanges/items/same.json (the
// bulk "unchanged from Classic" export) never carries full tooltip text --
// see fc-item.js's header comment -- so any "same"-status item resolved
// through it (profession recipes/reagents, dungeon quest rewards -- NOT
// boss loot, which already gets full tooltip text from a richer per-dungeon
// source file, see build-dungeons.js) renders a reconstructed tooltip
// missing Use effects, armor values, and similar lines only the beta
// client's own text would have.
//
// Re-fetching all 9,813 "same" items site-wide is unnecessary; this fetches
// only the ones actually referenced somewhere on the site AND still
// synthesized after the c:u category-label fix (see build-item-category-
// labels.js) -- computed by scanning data/professions-catalog/*.json and
// data/dungeons/*.json for itemId + status:"same" + tooltipSynthesized:true.
//
// Output is a dated overlay (data/sources/foreverchanges/
// item-tooltip-overlay-<date>.json, following this project's "immutable
// dated snapshot, never overwrite in place" convention for data/sources/)
// mapping item id -> real Forever-beta
// tooltip line array, loaded and merged onto the raw record's `x` field by
// fc-item.js before it's used, so every existing consumer (build-items.js,
// build-dungeons.js, build-professions.js via data/items.json) picks it up
// with no other code change.
//
// Usage: node scripts/fetch-referenced-item-tooltips.js

const fs = require("fs");
const path = require("path");
const { fetchItemTooltip } = require("./lib/fetch-item-tooltip");

const ROOT = path.join(__dirname, "..");
const today = new Date().toISOString().slice(0, 10);
const OUT_PATH = path.join(ROOT, "data", "sources", "foreverchanges", `item-tooltip-overlay-${today}.json`);

function collectScopeIds() {
  const ids = new Map(); // itemId -> name (for logging)
  for (const dir of ["data/professions-catalog", "data/dungeons"]) {
    const fullDir = path.join(ROOT, dir);
    for (const file of fs.readdirSync(fullDir)) {
      if (file === "uncertain.json") continue;
      const data = JSON.parse(fs.readFileSync(path.join(fullDir, file), "utf8"));
      const walk = (obj) => {
        if (Array.isArray(obj)) {
          obj.forEach(walk);
          return;
        }
        if (obj && typeof obj === "object") {
          if (obj.itemId && obj.status === "same" && obj.tooltipSynthesized) {
            ids.set(obj.itemId, obj.name);
          }
          for (const v of Object.values(obj)) walk(v);
        }
      };
      walk(data);
    }
  }
  return ids;
}

async function main() {
  const scope = collectScopeIds();
  console.log(`Scope: ${scope.size} referenced same-status items still missing real tooltip text.`);

  const overlay = {};
  const failures = [];
  let i = 0;
  for (const [itemId, name] of scope) {
    i++;
    const result = await fetchItemTooltip(itemId);
    if (!result.ok) {
      failures.push({ itemId, name, reason: result.status });
      console.warn(`  [${i}/${scope.size}] ${name} (${itemId}): FAILED (${result.status})`);
    } else if (result.noData) {
      console.log(`  [${i}/${scope.size}] ${name} (${itemId}): no Forever data yet, skipping`);
    } else if (result.lines) {
      overlay[itemId] = result.lines;
      console.log(`  [${i}/${scope.size}] ${name} (${itemId}): ${result.lines.length} lines`);
    } else {
      console.log(`  [${i}/${scope.size}] ${name} (${itemId}): no lines found`);
    }
    // Rate-limit: one-time manual pull, be polite.
    await new Promise((r) => setTimeout(r, 250));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(overlay, null, 2) + "\n");
  console.log(`\nWrote ${Object.keys(overlay).length} tooltip overlays to ${OUT_PATH}`);
  if (failures.length) {
    console.log(`${failures.length} failures:`, JSON.stringify(failures, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

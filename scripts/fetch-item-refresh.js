// Scoped refresh of items whose bulk export (data/sources/foreverchanges/
// items/*.json) has gone stale relative to foreverchanges.pro's live per-item
// pages, which track the current beta build. The bulk export is only
// re-pulled occasionally; a beta patch can change an item's tooltip text or
// item level in between (e.g. the 2026-09-24 patch: Wizard Oils reverted to
// Classic values, quest reward item-level corrections).
//
// Scope (kept small on purpose -- ~400 live fetches, not the 21k catalog):
//   - every "Wizard Oil" item
//   - every wand (item type "Wand")
//   - every item referenced from a dungeon quest (rewards / bring-back)
//
// For each, fetches the live Forever-beta tooltip + item level and compares
// with what data/items.json currently holds. ONLY items that actually differ
// are written, to a dated file (data/sources/foreverchanges/
// item-refresh-<date>.json, immutable-snapshot convention) as
// { "<itemId>": { x?: string[], l?: number } }. fc-item.js merges every such
// file onto the raw record (x -> tooltip, l -> item level) before mapping,
// so a rebuild of items/dungeons/professions picks it up and can't revert it.
//
// Usage: node scripts/fetch-item-refresh.js

const fs = require("fs");
const path = require("path");
const { fetchItemTooltip } = require("./lib/fetch-item-tooltip");

const ROOT = path.join(__dirname, "..");
const today = new Date().toISOString().slice(0, 10);
const OUT_PATH = path.join(ROOT, "data", "sources", "foreverchanges", `item-refresh-${today}.json`);

function collectScope(items) {
  const scope = new Map(); // id -> reason
  for (const it of items) {
    if (!it.itemId) continue;
    if (/Wizard Oil/.test(it.name)) scope.set(it.itemId, "wizard-oil");
    else if (it.type === "Wand") scope.set(it.itemId, "wand");
  }
  const dungeonDir = path.join(ROOT, "data", "dungeons");
  for (const f of fs.readdirSync(dungeonDir)) {
    const d = JSON.parse(fs.readFileSync(path.join(dungeonDir, f), "utf8"));
    const walk = (o, inQuests) => {
      if (Array.isArray(o)) return o.forEach((x) => walk(x, inQuests));
      if (o && typeof o === "object") {
        if (inQuests && o.itemId && !scope.has(o.itemId)) scope.set(o.itemId, "quest");
        for (const [k, v] of Object.entries(o)) walk(v, inQuests || k === "quests");
      }
    };
    walk(d, false);
  }
  return scope;
}

async function main() {
  const items = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "items.json"), "utf8")).items;
  const byId = new Map(items.map((i) => [i.itemId, i]));
  const scope = collectScope(items);
  console.log(`Scope: ${scope.size} items`);

  const out = {};
  const report = [];
  const ids = [...scope.keys()];
  let next = 0;
  const failures = [];
  async function worker() {
    while (next < ids.length) {
      const id = ids[next++];
      const cur = byId.get(id);
      let res;
      try {
        res = await fetchItemTooltip(id);
      } catch (e) {
        failures.push([id, String(e)]);
        continue;
      }
      if (!res.ok) {
        failures.push([id, res.status]);
        continue;
      }
      if (res.noData || !res.lines) continue; // nothing live to compare
      const patch = {};
      // The bulk export prefixes a non-equippable item's category line with a
      // tab (empty slot half: "\tOther") where the live page shows it plain
      // ("Other") -- same content, so compare tab-stripped and, where a live
      // line is equivalent to a stored one, keep the stored spelling.
      const strip = (l) => l.replace(/^\t/, "");
      if (cur && !cur.tooltipSynthesized) {
        const storedByStripped = new Map(cur.tooltip.map((l) => [strip(l), l]));
        const merged = res.lines.map((l) => storedByStripped.get(strip(l)) ?? l);
        if (JSON.stringify(cur.tooltip) !== JSON.stringify(merged)) patch.x = merged;
      }
      if (res.itemLevel != null && cur && cur.itemLevel !== res.itemLevel) patch.l = res.itemLevel;
      if (Object.keys(patch).length) {
        out[id] = patch;
        report.push({ id, name: cur?.name, reason: scope.get(id), oldLevel: cur?.itemLevel, patch });
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 1) + "\n");
  console.log(`Wrote ${Object.keys(out).length} changed items to ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`Failures: ${failures.length}`, failures.slice(0, 10));
  for (const r of report) {
    console.log(`- [${r.reason}] ${r.name} (${r.id})${r.patch.l != null ? ` ilvl ${r.oldLevel} -> ${r.patch.l}` : ""}${r.patch.x ? " tooltip changed" : ""}`);
  }
}

main();

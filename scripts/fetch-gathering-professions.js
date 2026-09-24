// One-time, manual-assisted pull for the 3 gathering professions (Mining,
// Herbalism, Skinning) -- foreverchanges.pro/professions/<slug> is plain
// SSR HTML, same as every other pull in this pipeline, no JSON API.
//
// These pages are genuinely NOT the crafting-profession shape (confirmed
// live before writing any parser -- see scripts/lib/parse-gathering-page.js's
// header comment): no reagent-based recipes, no category sidebar, no
// Merchant's Favor, no "Legacy points and title" milestone track. Mining
// gets an extra Smelting chapter (recipe-shaped, reused across bars);
// Herbalism has nodes+leveling only; Skinning has no separate "nodes" list
// at all -- its single band list doubles as both.
//
// Output: one dated snapshot file (data/sources/foreverchanges/
// gathering-professions-<date>.json, following this project's "immutable
// dated snapshot"
// convention) holding all 3 professions' raw parsed data plus their camp
// section (reusing parseCampSection from parse-profession-page.js -- the
// #camp chapter markup is identical between crafting and gathering pages).
//
// Usage: node scripts/fetch-gathering-professions.js

const fs = require("fs");
const path = require("path");
const { fetchGatheringPage } = require("./lib/parse-gathering-page");
const { parseCampSection } = require("./lib/parse-profession-page");

const ROOT = path.join(__dirname, "..");
const BASE = "https://foreverchanges.pro";
const today = new Date().toISOString().slice(0, 10);
const OUT_PATH = path.join(ROOT, "data", "sources", "foreverchanges", `gathering-professions-${today}.json`);

const GATHERING_PROFESSIONS = [
  { id: "mining", name: "Mining" },
  { id: "herbalism", name: "Herbalism" },
  { id: "skinning", name: "Skinning" },
];

async function main() {
  const out = {};
  for (const prof of GATHERING_PROFESSIONS) {
    console.log(`Fetching ${prof.name} (/professions/${prof.id})...`);
    const res = await fetch(`${BASE}/professions/${prof.id}`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) {
      console.warn(`  FAILED: HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();
    const gathering = await fetchGatheringPage(prof.id);
    const camp = parseCampSection(html);

    out[prof.id] = {
      nodes: gathering.nodes,
      leveling: gathering.leveling,
      skin: gathering.skin,
      smelting: gathering.smelting,
      camp_section: camp,
    };

    console.log(
      `  nodes=${gathering.nodes?.length ?? "n/a"} leveling=${gathering.leveling?.length ?? "n/a"} ` +
        `skin=${gathering.skin?.length ?? "n/a"} smelting=${gathering.smelting?.length ?? "n/a"} ` +
        `milestones=${camp?.milestones.length ?? 0} campObjects=${camp?.camp_objects.length ?? 0}`
    );

    await new Promise((r) => setTimeout(r, 500));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

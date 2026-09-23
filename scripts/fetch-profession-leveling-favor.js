// One-time, manual-assisted pull: fetches the Leveling (1 to current beta
// cap) and Merchant's Favor sections for the 6 professions that don't have
// them yet (only Alchemy and Blacksmithing were provided pre-built -- see
// CLAUDE.md's session handoff). Same technique as the dungeon quest pull:
// foreverchanges.pro's /professions/<slug> page is plain SSR HTML with no
// JSON API (confirmed on /item/<id> pages already; same site, same
// rendering approach), so this is curl-equivalent fetch + regex parsing,
// not a recurring scraper -- see scripts/lib/parse-profession-page.js for
// the actual parsing logic and scripts/build-professions.js for how the
// output shape gets normalized alongside Alchemy's/Blacksmithing's.
//
// Output matches data/professions/alchemy_leveling_and_merchants.json's own
// shape exactly (leveling_section with [min,max] range tuples and a
// singular "requirement" field, favor_section with tier text carrying its
// own embedded skill range) -- build-professions.js already normalizes
// this shape, no changes needed there.
//
// A rank whose steps run past whatever level the beta client has data for
// (e.g. Cooking's own page says "225 is the beta's cap for now") simply
// isn't in the source page at all -- this writes exactly what's there, no
// fabricated "coming soon" placeholder ranks; the existing UI already
// renders an honest "not recorded yet" for a profession/tier with nothing
// at all (see Alchemy's own empty 240 tier).
//
// Usage: node scripts/fetch-profession-leveling-favor.js

const fs = require("fs");
const path = require("path");
const { fetchProfessionPage } = require("./lib/parse-profession-page");
const { PROFESSIONS } = require("./lib/professions-config");

const ROOT = path.join(__dirname, "..");
const TARGET_IDS = ["cooking", "enchanting", "engineering", "first-aid", "leatherworking", "tailoring"];

async function main() {
  for (const id of TARGET_IDS) {
    const prof = PROFESSIONS.find((p) => p.id === id);
    console.log(`Fetching ${prof.name} (/professions/${id})...`);
    const result = await fetchProfessionPage(id);
    if (!result.ok) {
      console.warn(`  FAILED: HTTP ${result.status}`);
      continue;
    }
    if (!result.leveling_section && !result.favor_section) {
      console.warn(`  No leveling or favor section found on the page -- skipping.`);
      continue;
    }

    const levelingCount = result.leveling_section?.reduce((s, r) => s + r.steps.length, 0) ?? 0;
    const favorCount = result.favor_section?.reduce((s, t) => s + t.items.length, 0) ?? 0;
    console.log(
      `  Leveling: ${result.leveling_section?.length ?? 0} ranks, ${levelingCount} steps. ` +
        `Favor: ${result.favor_section?.length ?? 0} tiers, ${favorCount} items.`
    );

    const outPath = path.join(ROOT, "data", "professions", `${prof.dataFile}_leveling_and_merchants.json`);
    fs.writeFileSync(
      outPath,
      JSON.stringify({ leveling_section: result.leveling_section, favor_section: result.favor_section }, null, 2) + "\n"
    );
    console.log(`  Wrote ${outPath}`);

    // Rate-limit: one-time manual pull, be polite.
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

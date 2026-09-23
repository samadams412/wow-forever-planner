// One-time, manual-assisted pull: fetches the "Camp, skill rewards and
// perks" chapter (id="camp") for all 8 crafting professions and merges a
// new `camp_section` key into each profession's existing
// data/professions/<dataFile>_leveling_and_merchants.json -- leveling_
// section/favor_section are left untouched (Alchemy's/Blacksmithing's came
// from a different hand-provided source; the other 6 came from last
// session's own scrape -- neither should be silently re-derived here).
//
// Same technique as the leveling/favor pull: foreverchanges.pro/
// professions/<slug> is plain SSR HTML, no JSON API. See
// scripts/lib/parse-profession-page.js's parseCampSection for the actual
// parsing logic, including why the "Legacy perks" list on this same
// chapter is deliberately NOT scraped here (it's the same generic
// "Professions" Legacy tree on every profession's page, already in
// data/legacy-perks.json -- reused by id at build time instead).
//
// Usage: node scripts/fetch-profession-camp.js

const fs = require("fs");
const path = require("path");
const { fetchProfessionPage } = require("./lib/parse-profession-page");
const { PROFESSIONS } = require("./lib/professions-config");

const ROOT = path.join(__dirname, "..");

async function main() {
  for (const prof of PROFESSIONS) {
    console.log(`Fetching ${prof.name} (/professions/${prof.id})...`);
    const result = await fetchProfessionPage(prof.id);
    if (!result.ok) {
      console.warn(`  FAILED: HTTP ${result.status}`);
      continue;
    }
    if (!result.camp_section) {
      console.warn(`  No camp section found on the page -- skipping.`);
      continue;
    }

    console.log(
      `  Milestones: ${result.camp_section.milestones.length}, camp objects: ${result.camp_section.camp_objects.length}`
    );

    const outPath = path.join(ROOT, "data", "professions", `${prof.dataFile}_leveling_and_merchants.json`);
    const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};
    const merged = { ...existing, camp_section: result.camp_section };
    fs.writeFileSync(outPath, JSON.stringify(merged, null, 2) + "\n");
    console.log(`  Wrote ${outPath}`);

    // Rate-limit: one-time manual pull, be polite.
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

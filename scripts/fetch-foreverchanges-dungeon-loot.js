#!/usr/bin/env node
// Fetches a dungeon's boss/trash/rare loot straight from foreverchanges.pro's
// own JSON endpoint -- https://foreverchanges.pro/dungeons/<slug>.json --
// which returns exactly the {id, bosses, hints} shape already saved at
// data/sources/foreverchanges/dungeon_data/<slug>.json for every other
// dungeon. This is the real source those existing files came from (same
// compact field names -- i/n/q/l/r/s/c/u/t/k/x/z/e -- confirmed by fetching
// it directly and diffing against an existing file's shape); there was
// never a dedicated fetch script for it before now because every dungeon
// that had this data was pulled once, by hand, in an earlier session.
//
// Built specifically to backfill the 2 dungeons that had NO foreverchanges
// boss-loot pull as of 2026-09-22 (gnomeregan, sm-library -- see
// scripts/build-dungeons.js's BOSS_LOOT_FALLBACK) once foreverchanges.pro
// actually published loot data for them. Re-run for any dungeon any time a
// re-pull is wanted -- it just overwrites that dungeon's own dungeon_data
// file, same as re-running extract-foreverchanges-quests.js does for quests.
//
// Usage: node scripts/fetch-foreverchanges-dungeon-loot.js --slugs=a,b,c

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "data", "sources", "foreverchanges", "dungeon_data");

async function main() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slugs="));
  if (!slugArg) {
    console.error("Usage: node scripts/fetch-foreverchanges-dungeon-loot.js --slugs=a,b,c");
    process.exit(1);
  }
  const slugs = slugArg.slice("--slugs=".length).split(",");

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const summary = [];
  for (const slug of slugs) {
    try {
      const res = await fetch(`https://foreverchanges.pro/dungeons/${slug}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const itemCount = (data.bosses || []).reduce((n, b) => n + (b.items || []).length, 0);
      const outPath = path.join(OUT_DIR, `${slug}.json`);
      fs.writeFileSync(outPath, JSON.stringify(data, null, 1));
      summary.push({ slug, bosses: (data.bosses || []).length, items: itemCount });
      console.log(`${slug}: ${(data.bosses || []).length} boss(es)/group(s), ${itemCount} item(s)`);
    } catch (err) {
      summary.push({ slug, error: String(err) });
      console.error(`${slug}: ERROR ${err}`);
    }
  }
  console.log("\n--- summary ---");
  console.log(JSON.stringify(summary, null, 1));
}

main();

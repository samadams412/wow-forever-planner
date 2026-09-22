#!/usr/bin/env node
// Rebuilds data/dungeon-loot.json from the latest data/sources/wowtbc-loot-*.json
// snapshot -- mirrors scripts/build-spellbooks.js's own latest-snapshot pattern.
// This is an occasional manual pull (wowtbc.gg's community loot tables), not a
// recurring automated sync, so there's no diff-script counterpart for this one --
// just re-run this after adding a new dated snapshot.
//
// Usage: node scripts/build-dungeon-loot.js [snapshotPath]
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function findLatestSnapshot() {
  const sourcesDir = path.join(ROOT, "data", "sources");
  const files = fs
    .readdirSync(sourcesDir)
    .filter((f) => /^wowtbc-loot-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  if (files.length === 0) {
    throw new Error(`No wowtbc-loot-*.json snapshots found in ${sourcesDir}`);
  }
  return path.join(sourcesDir, files[files.length - 1]);
}

function build() {
  const snapshotPath = process.argv[2] ? path.resolve(process.argv[2]) : findLatestSnapshot();
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));

  // Passed through close to verbatim -- the snapshot is already shaped the
  // way the app wants it (see lib/dungeon-loot.ts's DungeonLoot type), since
  // the scraper that produced it was given that exact schema up front. This
  // script's job is just "pick the latest snapshot" plus a couple of sanity
  // checks, not a data transform.
  const out = {
    source: snapshot.source,
    pulledDate: snapshot.pulledDate,
    dungeons: snapshot.dungeons,
  };

  if (!out.source || !out.pulledDate || !out.dungeons) {
    throw new Error("Snapshot missing source/pulledDate/dungeons -- check its shape before building.");
  }

  const outPath = path.join(ROOT, "data", "dungeon-loot.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`Wrote ${path.relative(ROOT, outPath)} from ${path.relative(ROOT, snapshotPath)}`);
  console.log(`Dungeons: ${Object.keys(out.dungeons).length}`);
}

build();

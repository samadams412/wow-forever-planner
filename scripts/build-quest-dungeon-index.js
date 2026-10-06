// Builds data/quests/dungeon-membership.json: which catalog quests each dungeon
// lists on its own loot page (data/dungeons/<id>.json -> quests[]). The quest
// catalog itself has no dungeon field for dungeon-kind quests, so the dungeon
// filter on /reference/quests reads this instead. Quest ids that aren't in the
// catalog index are dropped, and dungeons with no catalog quests are skipped.
//
// Run via the prebuild script (package.json) after build-dungeons.js and
// build-quests.js.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/quests/index.json"), "utf8"));
const catalogIds = new Set(catalog.quests.map((q) => q.id));

const dungeonDir = path.join(root, "data/dungeons");
const dungeons = [];
for (const file of fs.readdirSync(dungeonDir).sort()) {
  if (!file.endsWith(".json")) continue;
  const dungeon = JSON.parse(fs.readFileSync(path.join(dungeonDir, file), "utf8"));
  const questIds = [];
  for (const quest of dungeon.quests || []) {
    const match = /^quest-(\d+)$/.exec(quest.id);
    if (!match) continue;
    const id = Number(match[1]);
    if (catalogIds.has(id) && !questIds.includes(id)) questIds.push(id);
  }
  if (questIds.length === 0) continue;
  dungeons.push({ id: dungeon.id, name: dungeon.name, questIds });
}

fs.writeFileSync(
  path.join(root, "data/quests/dungeon-membership.json"),
  JSON.stringify({ dungeons }, null, 2) + "\n",
);
console.log(`dungeon-membership: ${dungeons.length} dungeons, ${dungeons.reduce((n, d) => n + d.questIds.length, 0)} links`);

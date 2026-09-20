#!/usr/bin/env node
// Rebuilds data/spellbooks.json from a fresh talentsforever.com pull's full
// "every trainer spell to level 60, every rank" spellbook data -- replacing
// the old shape (one entry per spell, at whichever rank a level-38 demo
// character happened to have by BlizzCon 2026) with the real thing.
//
// Usage: node scripts/build-spellbooks.js [snapshotPath]
//   Defaults to the most recent data/sources/talentsforever-*.json snapshot
//   (a plain-dated file, matching diff-talentsforever.js's own picker) --
//   not a hardcoded date, since that goes stale the moment a new pull lands.
//
// What's preserved from the old data/spellbooks.json rather than rebuilt:
// - Each class's "General" tab (Attack, Shoot, Armor Proficiency, ...) --
//   the vendor's own _readme says this tab "still comes from the demo
//   spellbook," i.e. it never got the beta-client per-rank treatment the
//   rest of the spellbook did, so there's nothing new to ingest for it.
// - `demoRace` and `notes` -- hand-curated attribution/caveats for that
//   demo-era General tab data specifically, not generated.
// - The tab label "Pet" for Warlock/Hunter, even though the vendor now
//   calls these "Demons"/"Pets" -- lib/wow-data.ts's TREE_ICON_OVERRIDES
//   has hardcoded "warlock:Pet"/"hunter:Pet" keys, and renaming the tab
//   without updating those would silently break their icons (exactly the
//   "a rename touches more than tree data" trap from an earlier session --
//   see CLAUDE.md). Not worth the risk for a label.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CLASSES = ["warrior", "paladin", "hunter", "rogue", "priest", "shaman", "mage", "warlock", "druid"];
// Vendor's own tab names for the pet/demon tab, per class with one --
// classes without pets/demons have no entry and get no substitution.
const PET_TAB_SOURCE_NAME = { warlock: "Demons", hunter: "Pets" };

function classLabel(classId) {
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

// spell_desc keys are "Class|Spell|<Rank N | Passive | other | (empty)>".
// Groups every key for one spell, in ascending rank order (rank-less/
// non-numeric-suffix entries -- Passive, a shapeshift-form variant, etc. --
// sort after all numbered ranks and keep their raw suffix as `variant`).
function collectRanks(spellDesc, classId, spellName) {
  const prefix = `${classLabel(classId)}|${spellName}|`;
  const found = [];
  for (const [key, entry] of Object.entries(spellDesc)) {
    if (!key.startsWith(prefix)) continue;
    const suffix = key.slice(prefix.length);
    const m = suffix.match(/^Rank (\d+)$/);
    found.push({ rank: m ? parseInt(m[1], 10) : null, variant: m ? undefined : suffix || undefined, entry });
  }
  found.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  return found.map(({ rank, variant, entry }) => ({
    rank,
    variant,
    level: (() => {
      const m = (entry.lv || "").match(/level (\d+)/);
      return m ? parseInt(m[1], 10) : null;
    })(),
    description: entry.d,
    lines: entry.l,
    school: entry.sc,
    coefficient: entry.co,
    confirmed: entry.s === "beta",
    source: entry.src,
    classicStatus: entry.cs,
    classicDescription: entry.cd,
    classicLines: entry.cl,
    renamedFrom: entry.was,
  }));
}

function buildClassSpellbook(classId, snapshot, oldSpellbook) {
  const raw = snapshot.spellbooks[classLabel(classId)];
  const talentNames = new Set(raw.talents || []);
  const petTabSourceName = PET_TAB_SOURCE_NAME[classId];

  const tabs = raw.tabs.map((tab) => {
    // tabs[].spells is a flat list of [name, rankLabel] tuples, one per
    // rank -- dedupe to one entry per spell name, preserving first-seen
    // order, then attach every rank's full data from spell_desc.
    const seen = new Set();
    const spells = [];
    for (const [name, label] of tab.spells) {
      if (seen.has(name)) continue;
      seen.add(name);
      const ranks = collectRanks(snapshot.spell_desc, classId, name);
      spells.push({
        name,
        icon: raw.icons[name],
        passive: label === "Passive" || undefined,
        talent: talentNames.has(name) || undefined,
        ranks,
      });
    }
    // Our own tab label stays "Pet" regardless of the vendor's per-class
    // name -- see the file-level comment for why.
    const tabName = tab.name === petTabSourceName ? "Pet" : tab.name;
    return { name: tabName, spells };
  });

  // The General tab is untouched, demo-sourced data -- carried over as-is.
  const generalTab = oldSpellbook.tabs.find((t) => t.name === "General");
  if (generalTab) tabs.push(generalTab);

  const classSpellbook = {
    demoRace: oldSpellbook.demoRace,
    notes: oldSpellbook.notes,
    notOpened: oldSpellbook.notOpened,
    tabs,
  };
  if (raw.checked) {
    classSpellbook.checked = {
      npc: raw.checked.npc,
      zone: raw.checked.zone,
      date: raw.checked.date,
      gameBuild: raw.checked.game_build,
      rows: raw.checked.rows,
      lacked: raw.checked.lacked,
      levelDiffs: raw.checked.level_diffs,
    };
  }
  if (raw.gone && raw.gone.length > 0) classSpellbook.gone = raw.gone;

  return classSpellbook;
}

function findLatestSnapshot() {
  const sourcesDir = path.join(ROOT, "data", "sources");
  const files = fs
    .readdirSync(sourcesDir)
    .filter((f) => /^talentsforever-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  if (files.length === 0) {
    throw new Error(`No talentsforever-*.json snapshots found in ${sourcesDir}`);
  }
  return path.join(sourcesDir, files[files.length - 1]);
}

function build() {
  const snapshotPath = process.argv[2] ? path.resolve(process.argv[2]) : findLatestSnapshot();
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const oldData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "spellbooks.json"), "utf8"));

  const classes = {};
  for (const classId of CLASSES) {
    classes[classId] = buildClassSpellbook(classId, snapshot, oldData.classes[classId]);
  }

  const out = {
    source: `WoW Forever beta client, build ${snapshot.spellbooks[classLabel(CLASSES[0])].build} (via talentsforever.com)`,
    classes,
  };

  const outPath = path.join(ROOT, "data", "spellbooks.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`Wrote ${path.relative(ROOT, outPath)}`);
}

build();

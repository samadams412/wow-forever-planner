#!/usr/bin/env node
// Structured diff between two talentsforever.com data.json snapshots
// (see data/sources/README.md for the snapshot convention this reads).
//
// Usage:
//   node scripts/diff-talentsforever.js [oldPath] [newPath]
//   node scripts/diff-talentsforever.js                       # defaults to
//     the two most recent data/sources/talentsforever-*.json files
//
// Writes a human-readable markdown summary and a machine-readable JSON
// diff into data/sources/diffs/, and prints the markdown to stdout.
//
// Scope: this catches anything that shows up as a JSON field change --
// added/removed/changed talents, legacy perks, and spellbook entries, plus
// any brand-new field appearing anywhere (so a schema addition like the
// passive/cost fields, or 09-15's spell_desc cs/cd/cl fields, gets flagged
// even before anyone knows to look for it). It CANNOT catch a changelog
// item that has no JSON-level signal at all -- a UI/UX rebuild, a CSS fix,
// a copy-only wording change on our own site. Those always need a human
// to read the changelog text itself; the "Not diffable" section below
// exists to make that limitation explicit rather than silently missing.

const fs = require("fs");
const path = require("path");

const SOURCES_DIR = path.join(__dirname, "..", "data", "sources");
const DIFFS_DIR = path.join(SOURCES_DIR, "diffs");

function findDefaultSnapshots() {
  const files = fs
    .readdirSync(SOURCES_DIR)
    .filter((f) => /^talentsforever-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  if (files.length < 2) {
    throw new Error(`Need at least 2 snapshots in ${SOURCES_DIR}, found ${files.length}`);
  }
  return [
    path.join(SOURCES_DIR, files[files.length - 2]),
    path.join(SOURCES_DIR, files[files.length - 1]),
  ];
}

function loadSnapshot(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function snapshotLabel(p) {
  const m = path.basename(p).match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : path.basename(p);
}

// --- generic helpers -------------------------------------------------

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Collects every key seen on any object in `items` (an array of plain
// objects). Used to catch schema drift -- a field that didn't exist in
// the old snapshot's keyset at all is worth calling out even if we don't
// yet know what it means.
function collectKeys(items) {
  const keys = new Set();
  for (const item of items) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      for (const k of Object.keys(item)) keys.add(k);
    }
  }
  return keys;
}

// --- talent extraction -------------------------------------------------

// Flattens talents.<Class>.trees[].talents[] into a flat list, tagging
// each with its class/tree for reporting, keyed by name (the stable
// identifier -- see data/sources/README.md's ingestion notes).
function flattenTalents(snapshot) {
  const out = [];
  for (const [className, classData] of Object.entries(snapshot.talents || {})) {
    for (const tree of classData.trees || []) {
      for (const talent of tree.talents || []) {
        out.push({ className, treeName: tree.name, key: `${className}|${talent.name}`, talent });
      }
    }
  }
  return out;
}

// Same idea for a tree's `removed` array (Classic-only talents no longer
// in Forever) -- we don't consume this data anywhere on the site, so it
// only gets a lightweight added/removed check, not full field diffing.
function flattenRemovedTalents(snapshot) {
  const out = [];
  for (const [className, classData] of Object.entries(snapshot.talents || {})) {
    for (const tree of classData.trees || []) {
      for (const talent of tree.removed || []) {
        out.push({ className, treeName: tree.name, key: `${className}|${talent.name}`, talent });
      }
    }
  }
  return out;
}

const TALENT_DIFF_FIELDS = [
  "icon",
  "desc",
  "cost",
  "passive",
  "max",
  "row",
  "col",
  "complete",
  "confirmed",
  ["classic", "text"],
  ["classic", "status"],
  ["classic", "tree"],
  ["classic", "row"],
  ["classic", "col"],
  ["classic", "max"],
];

function getField(obj, field) {
  if (Array.isArray(field)) {
    let cur = obj;
    for (const k of field) {
      if (cur == null) return undefined;
      cur = cur[k];
    }
    return cur;
  }
  return obj ? obj[field] : undefined;
}

function fieldLabel(field) {
  return Array.isArray(field) ? field.join(".") : field;
}

// Strips HTML-ish markup/comments and collapses whitespace, so a change
// that's purely markup cleanup (extra spaces, a stray <!--comment-->, an
// SoD <span> tag) reads as "no real content change" -- vs. an actual
// wording/number change, which won't survive this normalization.
function normalizeText(v) {
  if (typeof v !== "string") return v;
  return v
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isTrivialTextChange(field, oldVal, newVal) {
  if (typeof oldVal !== "string" || typeof newVal !== "string") return false;
  return normalizeText(oldVal) === normalizeText(newVal);
}

function diffTalents(oldSnapshot, newSnapshot) {
  const oldTalents = new Map(flattenTalents(oldSnapshot).map((t) => [t.key, t]));
  const newTalents = new Map(flattenTalents(newSnapshot).map((t) => [t.key, t]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [key, entry] of newTalents) {
    if (!oldTalents.has(key)) added.push(entry);
  }
  for (const [key, entry] of oldTalents) {
    if (!newTalents.has(key)) removed.push(entry);
  }
  for (const [key, oldEntry] of oldTalents) {
    const newEntry = newTalents.get(key);
    if (!newEntry) continue;
    const fieldChanges = [];
    for (const field of TALENT_DIFF_FIELDS) {
      const oldVal = getField(oldEntry.talent, field);
      const newVal = getField(newEntry.talent, field);
      if (!deepEqual(oldVal, newVal)) {
        const label = fieldLabel(field);
        fieldChanges.push({ field: label, old: oldVal, new: newVal, trivial: isTrivialTextChange(label, oldVal, newVal) });
      }
    }
    if (fieldChanges.length > 0) {
      const allTrivial = fieldChanges.every((fc) => fc.trivial);
      changed.push({
        className: oldEntry.className,
        treeName: oldEntry.treeName,
        name: oldEntry.talent.name,
        fieldChanges,
        allTrivial,
      });
    }
  }

  // Schema drift: any key present on a new-snapshot talent that never
  // appeared on ANY old-snapshot talent.
  const oldKeys = collectKeys([...oldTalents.values()].map((t) => t.talent));
  const newKeys = collectKeys([...newTalents.values()].map((t) => t.talent));
  const newFields = [...newKeys].filter((k) => !oldKeys.has(k));

  const removedList = new Map(flattenRemovedTalents(oldSnapshot).map((t) => [t.key, t]));
  const removedListNew = new Map(flattenRemovedTalents(newSnapshot).map((t) => [t.key, t]));
  const removedArrayAdded = [...removedListNew.keys()].filter((k) => !removedList.has(k));
  const removedArrayRemoved = [...removedList.keys()].filter((k) => !removedListNew.has(k));

  return { added, removed, changed, newFields, removedArrayAdded, removedArrayRemoved };
}

// --- legacy perks --------------------------------------------------

// Raw shape is [name, maxRank, description, icon] per perk (see
// data/sources/README.md) -- normalize to an object for diffing.
function flattenLegacyPerks(snapshot) {
  const out = [];
  for (const tree of (snapshot.legacy || {}).trees || []) {
    for (const perk of tree.perks || []) {
      const [name, maxRank, description, icon] = perk;
      out.push({ treeName: tree.name, key: `${tree.name}|${name}`, perk: { name, maxRank, description, icon } });
    }
  }
  return out;
}

function diffLegacyPerks(oldSnapshot, newSnapshot) {
  const oldPerks = new Map(flattenLegacyPerks(oldSnapshot).map((p) => [p.key, p]));
  const newPerks = new Map(flattenLegacyPerks(newSnapshot).map((p) => [p.key, p]));

  const added = [...newPerks.values()].filter((p) => !oldPerks.has(p.key));
  const removed = [...oldPerks.values()].filter((p) => !newPerks.has(p.key));
  const changed = [];
  for (const [key, oldEntry] of oldPerks) {
    const newEntry = newPerks.get(key);
    if (!newEntry) continue;
    const fieldChanges = [];
    for (const field of ["maxRank", "description", "icon"]) {
      if (!deepEqual(oldEntry.perk[field], newEntry.perk[field])) {
        fieldChanges.push({ field, old: oldEntry.perk[field], new: newEntry.perk[field] });
      }
    }
    if (fieldChanges.length > 0) {
      changed.push({ treeName: oldEntry.treeName, name: oldEntry.perk.name, fieldChanges });
    }
  }
  return { added, removed, changed };
}

// --- spellbooks (per-class trainer spell listings) --------------------

function flattenSpellbookEntries(snapshot) {
  const out = [];
  for (const [className, book] of Object.entries(snapshot.spellbooks || {})) {
    if (className === "source" || Array.isArray(book) || typeof book !== "object") continue;
    for (const tab of book.tabs || []) {
      for (const spell of tab.spells || []) {
        const name = Array.isArray(spell) ? spell[0] : spell.name;
        out.push({ className, tabName: tab.name, key: `${className}|${tabName_(tab)}|${name}`, name });
      }
    }
  }
  return out;
}
function tabName_(tab) {
  return tab.name;
}

function diffSpellbooks(oldSnapshot, newSnapshot) {
  const oldEntries = new Map(flattenSpellbookEntries(oldSnapshot).map((e) => [e.key, e]));
  const newEntries = new Map(flattenSpellbookEntries(newSnapshot).map((e) => [e.key, e]));
  const added = [...newEntries.values()].filter((e) => !oldEntries.has(e.key));
  const removed = [...oldEntries.values()].filter((e) => !newEntries.has(e.key));

  // Notes text often carries corrections that never show up as a
  // structural field change (README explicitly calls this out).
  const notesChanges = [];
  const classNames = new Set([...Object.keys(oldSnapshot.spellbooks || {}), ...Object.keys(newSnapshot.spellbooks || {})]);
  for (const className of classNames) {
    const oldNotes = (oldSnapshot.spellbooks?.[className] || {}).notes;
    const newNotes = (newSnapshot.spellbooks?.[className] || {}).notes;
    if (oldNotes !== undefined && newNotes !== undefined && !deepEqual(oldNotes, newNotes)) {
      notesChanges.push({ className, old: oldNotes, new: newNotes });
    }
  }

  return { added, removed, notesChanges };
}

// --- simple structural sections (racials, class_racials, class_abilities) --

function diffOpaqueSection(oldSnapshot, newSnapshot, sectionKey) {
  const oldVal = oldSnapshot[sectionKey];
  const newVal = newSnapshot[sectionKey];
  const changed = !deepEqual(oldVal, newVal);
  let newFields = [];
  if (changed && oldVal && newVal && typeof oldVal === "object" && typeof newVal === "object") {
    // Best-effort schema-drift check one level down (per top-level key's
    // own object shape), for sections that aren't structured as a flat
    // array of talent-like records.
    const oldLeaf = Object.values(oldVal).flatMap((v) => (Array.isArray(v) ? v : [v]));
    const newLeaf = Object.values(newVal).flatMap((v) => (Array.isArray(v) ? v : [v]));
    const oldKeys = collectKeys(oldLeaf);
    const newKeys = collectKeys(newLeaf);
    newFields = [...newKeys].filter((k) => !oldKeys.has(k));
  }
  return { changed, newFields };
}

// --- spell_desc (spellbook tooltip text, keyed Class|Spell|Rank) -------

function diffSpellDesc(oldSnapshot, newSnapshot) {
  const oldDesc = oldSnapshot.spell_desc || {};
  const newDesc = newSnapshot.spell_desc || {};
  const oldKeys = new Set(Object.keys(oldDesc));
  const newKeys = new Set(Object.keys(newDesc));
  const added = [...newKeys].filter((k) => !oldKeys.has(k));
  const removed = [...oldKeys].filter((k) => !newKeys.has(k));
  const changed = [...newKeys].filter((k) => oldKeys.has(k) && !deepEqual(oldDesc[k], newDesc[k]));

  const oldFieldKeys = collectKeys(Object.values(oldDesc));
  const newFieldKeys = collectKeys(Object.values(newDesc));
  const newFields = [...newFieldKeys].filter((k) => !oldFieldKeys.has(k));

  return { added, removed, changed, newFields };
}

// --- markdown rendering -------------------------------------------------

function renderTalentField(field, old, newVal) {
  const fmt = (v) => (typeof v === "string" && v.length > 90 ? v.slice(0, 90) + "…" : JSON.stringify(v));
  return `  - **${field}**: ${fmt(old)} → ${fmt(newVal)}`;
}

function renderMarkdown({ oldLabel, newLabel, talents, legacy, spellbooks, spellDesc, opaque }) {
  const lines = [];
  lines.push(`# talentsforever diff: ${oldLabel} → ${newLabel}`, "");

  lines.push("## Talents", "");
  if (talents.added.length === 0 && talents.removed.length === 0 && talents.changed.length === 0) {
    lines.push("No talent changes.", "");
  } else {
    if (talents.added.length > 0) {
      lines.push(`### Added (${talents.added.length})`);
      for (const t of talents.added) lines.push(`- ${t.className} / ${t.treeName} / **${t.talent.name}**`);
      lines.push("");
    }
    if (talents.removed.length > 0) {
      lines.push(`### Removed (${talents.removed.length})`);
      for (const t of talents.removed) lines.push(`- ${t.className} / ${t.treeName} / **${t.talent.name}**`);
      lines.push("");
    }
    if (talents.changed.length > 0) {
      const substantive = talents.changed.filter((t) => !t.allTrivial);
      const trivial = talents.changed.filter((t) => t.allTrivial);
      lines.push(`### Changed (${talents.changed.length})`);
      if (substantive.length > 0) {
        for (const t of substantive) {
          lines.push(`- ${t.className} / ${t.treeName} / **${t.name}**`);
          for (const fc of t.fieldChanges) lines.push(renderTalentField(fc.field, fc.old, fc.new));
        }
      }
      if (trivial.length > 0) {
        lines.push("");
        lines.push(
          `<details><summary>${trivial.length} more with only markup/whitespace cleanup (no wording change) -- click to expand</summary>`,
          ""
        );
        for (const t of trivial) {
          lines.push(`- ${t.className} / ${t.treeName} / **${t.name}**`);
          for (const fc of t.fieldChanges) lines.push(renderTalentField(fc.field, fc.old, fc.new));
        }
        lines.push("", "</details>");
      }
      lines.push("");
    }
  }
  if (talents.newFields.length > 0) {
    lines.push(`### New fields seen on talents (${talents.newFields.length})`, "");
    lines.push("Fields that never appeared on any talent in the old snapshot -- may need a new display/ingestion rule:");
    for (const f of talents.newFields) lines.push(`- \`${f}\``);
    lines.push("");
  }
  if (talents.removedArrayAdded.length > 0 || talents.removedArrayRemoved.length > 0) {
    lines.push("### Classic-only \"removed\" talent lists", "");
    if (talents.removedArrayAdded.length > 0) {
      lines.push(`Newly listed as removed-since-Classic (${talents.removedArrayAdded.length}): ${talents.removedArrayAdded.join(", ")}`);
    }
    if (talents.removedArrayRemoved.length > 0) {
      lines.push(`No longer listed there (${talents.removedArrayRemoved.length}): ${talents.removedArrayRemoved.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## Legacy perks", "");
  if (legacy.added.length === 0 && legacy.removed.length === 0 && legacy.changed.length === 0) {
    lines.push("No legacy perk changes.", "");
  } else {
    if (legacy.added.length > 0) {
      lines.push(`### Added (${legacy.added.length})`);
      for (const p of legacy.added) lines.push(`- ${p.treeName} / **${p.perk.name}**`);
      lines.push("");
    }
    if (legacy.removed.length > 0) {
      lines.push(`### Removed (${legacy.removed.length})`);
      for (const p of legacy.removed) lines.push(`- ${p.treeName} / **${p.perk.name}**`);
      lines.push("");
    }
    if (legacy.changed.length > 0) {
      lines.push(`### Changed (${legacy.changed.length})`);
      for (const p of legacy.changed) {
        lines.push(`- ${p.treeName} / **${p.name}**`);
        for (const fc of p.fieldChanges) lines.push(renderTalentField(fc.field, fc.old, fc.new));
      }
      lines.push("");
    }
  }

  lines.push("## Spellbooks (trainer spell listings)", "");
  if (spellbooks.added.length === 0 && spellbooks.removed.length === 0 && spellbooks.notesChanges.length === 0) {
    lines.push("No spellbook entry or notes changes.", "");
  } else {
    if (spellbooks.added.length > 0) {
      lines.push(`### Added (${spellbooks.added.length})`);
      for (const e of spellbooks.added) lines.push(`- ${e.className} / ${e.tabName} / **${e.name}**`);
      lines.push("");
    }
    if (spellbooks.removed.length > 0) {
      lines.push(`### Removed (${spellbooks.removed.length})`);
      for (const e of spellbooks.removed) lines.push(`- ${e.className} / ${e.tabName} / **${e.name}**`);
      lines.push("");
    }
    if (spellbooks.notesChanges.length > 0) {
      lines.push(`### Notes text changed (${spellbooks.notesChanges.length} classes)`);
      lines.push("Per data/sources/README.md, notes prose has repeatedly carried real corrections -- read these by hand:");
      for (const n of spellbooks.notesChanges) lines.push(`- **${n.className}**`);
      lines.push("");
    }
  }

  lines.push("## Spell tooltip text (spell_desc)", "");
  lines.push(
    `Added: ${spellDesc.added.length}, Removed: ${spellDesc.removed.length}, Changed: ${spellDesc.changed.length}`,
    ""
  );
  if (spellDesc.removed.length > 0) {
    lines.push(`### Removed (${spellDesc.removed.length})`);
    for (const k of spellDesc.removed) lines.push(`- ${k}`);
    lines.push("");
  }
  if (spellDesc.newFields.length > 0) {
    lines.push(`### New fields seen on spell_desc entries (${spellDesc.newFields.length})`, "");
    lines.push("Fields that never appeared before -- check whether they represent a feature worth surfacing on the site:");
    for (const f of spellDesc.newFields) lines.push(`- \`${f}\``);
    lines.push("");
  }
  lines.push(
    "Added/changed spell_desc keys aren't listed individually here (often 10s-100s of entries) -- see the JSON diff file for the full list.",
    ""
  );

  lines.push("## Other sections (structural check only)", "");
  for (const [label, result] of Object.entries(opaque)) {
    lines.push(`- **${label}**: ${result.changed ? "changed" : "unchanged"}${result.newFields.length ? ` (new fields: ${result.newFields.map((f) => `\`${f}\``).join(", ")})` : ""}`);
  }
  lines.push("");

  lines.push("## Known limits of this script", "");
  lines.push(
    "This is a JSON-field diff. It cannot see anything that isn't a JSON",
    "field change -- a UI/UX rebuild, a CSS-only fix, or copy/wording",
    "changed only on our own site (not sourced from this data) will never",
    "show up here. Read the vendor's own `changelog` array in the new",
    "snapshot by hand for those; this script only tells you what data",
    "changed underneath them.",
    ""
  );

  return lines.join("\n");
}

// --- main -------------------------------------------------------------

function main() {
  const [, , argOld, argNew] = process.argv;
  const [oldPath, newPath] = argOld && argNew ? [argOld, argNew] : findDefaultSnapshots();

  const oldSnapshot = loadSnapshot(oldPath);
  const newSnapshot = loadSnapshot(newPath);
  const oldLabel = snapshotLabel(oldPath);
  const newLabel = snapshotLabel(newPath);

  const talents = diffTalents(oldSnapshot, newSnapshot);
  const legacy = diffLegacyPerks(oldSnapshot, newSnapshot);
  const spellbooks = diffSpellbooks(oldSnapshot, newSnapshot);
  const spellDesc = diffSpellDesc(oldSnapshot, newSnapshot);
  const opaque = {
    racials: diffOpaqueSection(oldSnapshot, newSnapshot, "racials"),
    class_racials: diffOpaqueSection(oldSnapshot, newSnapshot, "class_racials"),
    class_abilities: diffOpaqueSection(oldSnapshot, newSnapshot, "class_abilities"),
  };

  const markdown = renderMarkdown({ oldLabel, newLabel, talents, legacy, spellbooks, spellDesc, opaque });
  const rawDiff = { oldPath, newPath, oldLabel, newLabel, talents, legacy, spellbooks, spellDesc, opaque };

  fs.mkdirSync(DIFFS_DIR, { recursive: true });
  const base = `${oldLabel}_to_${newLabel}`;
  const mdPath = path.join(DIFFS_DIR, `${base}.md`);
  const jsonPath = path.join(DIFFS_DIR, `${base}.json`);
  fs.writeFileSync(mdPath, markdown + "\n", "utf8");
  fs.writeFileSync(jsonPath, JSON.stringify(rawDiff, null, 2) + "\n", "utf8");

  console.log(markdown);
  console.error(`\n(written to ${path.relative(process.cwd(), mdPath)} and ${path.relative(process.cwd(), jsonPath)})`);
}

main();

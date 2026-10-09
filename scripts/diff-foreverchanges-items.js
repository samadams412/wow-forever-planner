#!/usr/bin/env node
// Structured diff between two foreverchanges.pro item-catalog pulls (the
// same data/sources/foreverchanges/items/{new,changed,same,missing}.json
// set build-items.js reads -- see that script's header and scripts/lib/
// fc-item.js for the shared raw-item shape this reads directly).
//
// Usage:
//   node scripts/diff-foreverchanges-items.js <oldDir> <newDir>
// where each dir contains new.json/changed.json/same.json/missing.json
// for one pull (e.g. pass the items/ dir twice, once after renaming/
// copying the old build's four files aside -- see below for how this
// session's two pulls are named).
//
// foreverchanges buckets each item into exactly one of new/changed/same/
// missing per pull. An item's raw record is NOT trusted to say "changed"
// vs "same" at face value -- every item seen in both pulls gets a real
// field-level diff here, bucket-crossing included, so a "same" item that
// quietly moved to "changed" (or vice versa) is reported as a field
// change, not just a bucket relabel.
//
// Writes a markdown summary + machine-readable JSON diff into
// data/sources/foreverchanges/items/diffs/, and prints the markdown to
// stdout.

const fs = require("fs");
const path = require("path");
const { isKnownDuplicateId, canonicalIdFor } = require("./lib/item-duplicates");

const ROOT = path.join(__dirname, "..");
const ITEMS_DIR = path.join(ROOT, "data", "sources", "foreverchanges", "items");
const DIFFS_DIR = path.join(ITEMS_DIR, "diffs");
const ARCHIVE_DIR = path.join(ITEMS_DIR, "archive");

const BUCKETS = ["new", "changed", "same", "missing"];

// Raw foreverchanges fields worth diffing directly (see scripts/lib/
// fc-item.js's fcItemToUnified for what each short key means). `t`
// (status/bucket) is handled separately as a bucket-change, not a field
// diff, since every item in a given file shares the same `t`.
const ITEM_DIFF_FIELDS = ["n", "q", "l", "r", "s", "c", "u", "k", "x", "y"];
const FIELD_LABELS = {
  n: "name",
  q: "quality",
  l: "itemLevel",
  r: "requiredLevel",
  s: "slot",
  c: "itemClass",
  u: "subclass",
  k: "icon",
  x: "tooltip",
  y: "classicTooltip",
};

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function loadBucket(dir, bucket) {
  const p = path.join(dir, `${bucket}.json`);
  if (!fs.existsSync(p)) return { items: [], meta: null };
  const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
  return { items: parsed.items || [], meta: parsed };
}

// Loads all four bucket files from a directory into one id -> {bucket, raw}
// map (an item id only ever appears in one bucket per pull, per
// foreverchanges' own export).
function loadPull(dir) {
  const byId = new Map();
  let meta = null;
  for (const bucket of BUCKETS) {
    const { items, meta: bucketMeta } = loadBucket(dir, bucket);
    if (bucketMeta) meta = meta || bucketMeta;
    for (const raw of items) {
      if (raw.i === undefined) continue;
      byId.set(raw.i, { bucket, raw });
    }
  }
  return { byId, meta };
}

function pullLabel(meta, dir) {
  if (meta && meta.forever_build) return `${meta.forever_build} (${meta.forever_build_date})`;
  return path.basename(dir);
}

// Builds a name -> [{id, bucket}] index over a pull, for detecting a new
// id whose name collides with something already in the catalog (see
// `possibleDuplicates` below). Case/whitespace-insensitive, matching how
// scripts/lib/profession-item-resolver.js's buildNameIndex joins names.
function nameIndex(pull) {
  const byName = new Map();
  for (const [id, entry] of pull.byId) {
    const key = (entry.raw.n ?? "").trim().toLowerCase();
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push({ id, bucket: entry.bucket });
  }
  return byName;
}

function diffItems(oldPull, newPull) {
  const added = [];
  const knownDuplicates = [];
  const removed = [];
  const bucketChanged = [];
  const fieldChanged = [];

  for (const [id, newEntry] of newPull.byId) {
    if (oldPull.byId.has(id)) continue;
    if (isKnownDuplicateId(id)) {
      knownDuplicates.push({ ...newEntry, canonicalId: canonicalIdFor(id) });
    } else {
      added.push(newEntry);
    }
  }
  for (const [id, oldEntry] of oldPull.byId) {
    if (!newPull.byId.has(id)) removed.push(oldEntry);
  }

  // A genuinely new id (not already a confirmed duplicate above) whose
  // name matches something that existed under a DIFFERENT id in the old
  // pull is exactly the shape of bug this caught on 2026-10-08: the
  // profession-recipe name resolver would silently treat whichever one it
  // sees first as canonical. Surface it instead of guessing -- a human
  // confirms it (one way or the other) and it either gets added to
  // known-duplicate-ids.json or turns out to be a real coincidentally-
  // named new item.
  const oldByName = nameIndex(oldPull);
  const possibleDuplicates = [];
  for (const entry of added) {
    const key = (entry.raw.n ?? "").trim().toLowerCase();
    const matches = (oldByName.get(key) ?? []).filter((m) => m.id !== entry.raw.i);
    if (matches.length > 0) possibleDuplicates.push({ ...entry, matches });
  }

  for (const [id, oldEntry] of oldPull.byId) {
    const newEntry = newPull.byId.get(id);
    if (!newEntry) continue;

    const fieldChanges = [];
    for (const field of ITEM_DIFF_FIELDS) {
      const oldVal = oldEntry.raw[field];
      const newVal = newEntry.raw[field];
      if (!deepEqual(oldVal, newVal)) {
        fieldChanges.push({ field: FIELD_LABELS[field] || field, old: oldVal, new: newVal });
      }
    }

    const bucketDiffers = oldEntry.bucket !== newEntry.bucket;
    const name = newEntry.raw.n ?? oldEntry.raw.n;

    if (bucketDiffers) {
      bucketChanged.push({ id, name, oldBucket: oldEntry.bucket, newBucket: newEntry.bucket, fieldChanges });
    } else if (fieldChanges.length > 0) {
      fieldChanged.push({ id, name, bucket: oldEntry.bucket, fieldChanges });
    }
  }

  return { added, knownDuplicates, possibleDuplicates, removed, bucketChanged, fieldChanged };
}

function fmt(v) {
  if (Array.isArray(v)) {
    const joined = v.join(" | ");
    return joined.length > 160 ? joined.slice(0, 160) + "…" : joined;
  }
  const s = JSON.stringify(v);
  return s && s.length > 160 ? s.slice(0, 160) + "…" : s;
}

function renderMarkdown({ oldLabel, newLabel, diff }) {
  const lines = [];
  lines.push(`# foreverchanges items diff: ${oldLabel} -> ${newLabel}`, "");

  lines.push(
    `Added: ${diff.added.length}, Removed: ${diff.removed.length}, ` +
      `Moved between buckets: ${diff.bucketChanged.length}, ` +
      `Changed (same bucket, field-level): ${diff.fieldChanged.length}, ` +
      `Known duplicate ids skipped: ${diff.knownDuplicates.length}, ` +
      `Possible duplicates needing review: ${diff.possibleDuplicates.length}`,
    ""
  );

  if (diff.possibleDuplicates.length > 0) {
    lines.push(`## ⚠ Possible duplicate items -- needs review (${diff.possibleDuplicates.length})`, "");
    lines.push(
      "Each of these is a genuinely new id whose name matches something",
      "already in the catalog under a different id. This is exactly the shape",
      "of the 2026-10-08 bug where the profession-recipe name resolver",
      "silently treated the new id as canonical. **Do not treat these as",
      "ordinary new items without checking first** -- confirm by hand whether",
      "each is a real new item that coincidentally shares a name, or the",
      "source re-issuing an id for something we already have. Once confirmed",
      "as a duplicate, add it to data/sources/foreverchanges/items/",
      "known-duplicate-ids.json so it stops being reported here and the",
      "build scripts drop it before it can shadow the real id.",
      ""
    );
    for (const e of diff.possibleDuplicates) {
      const matchList = e.matches.map((m) => `\`${m.id}\` (${m.bucket})`).join(", ");
      lines.push(`- \`${e.raw.i}\` **${e.raw.n}** (bucket: ${e.bucket}) -- matches existing id(s): ${matchList}`);
    }
    lines.push("");
  }

  lines.push(`## New items (${diff.added.length})`, "");
  if (diff.added.length === 0) {
    lines.push("None.", "");
  } else {
    for (const e of diff.added) lines.push(`- \`${e.raw.i}\` **${e.raw.n}** (bucket: ${e.bucket})`);
    lines.push("");
  }

  if (diff.knownDuplicates.length > 0) {
    lines.push(`## Known duplicate ids -- already resolved (${diff.knownDuplicates.length})`, "");
    lines.push(
      "Present in this pull but already confirmed (see known-duplicate-ids.json)",
      "as the source re-issuing an id for an item we already track under its",
      "canonical id below. Not reported as new/changed, and never enters",
      "data/items.json -- no action needed.",
      ""
    );
    for (const e of diff.knownDuplicates) {
      lines.push(`- \`${e.raw.i}\` **${e.raw.n}** -- duplicate of \`${e.canonicalId}\``);
    }
    lines.push("");
  }

  lines.push(`## Removed items (${diff.removed.length})`, "");
  if (diff.removed.length === 0) {
    lines.push("None.", "");
  } else {
    for (const e of diff.removed) lines.push(`- \`${e.raw.i}\` **${e.raw.n}** (was bucket: ${e.bucket})`);
    lines.push("");
  }

  lines.push(`## Moved between buckets (${diff.bucketChanged.length})`, "");
  lines.push(
    "Foreverchanges re-bucketed these (e.g. same -> changed, or changed -> same) --",
    "listed separately from in-place field changes below since the bucket itself",
    "is the headline signal here.",
    ""
  );
  if (diff.bucketChanged.length === 0) {
    lines.push("None.", "");
  } else {
    for (const e of diff.bucketChanged) {
      lines.push(`- \`${e.id}\` **${e.name}**: ${e.oldBucket} -> ${e.newBucket}`);
      for (const fc of e.fieldChanges) lines.push(`  - **${fc.field}**: ${fmt(fc.old)} -> ${fmt(fc.new)}`);
    }
    lines.push("");
  }

  lines.push(`## Changed in place (${diff.fieldChanged.length})`, "");
  if (diff.fieldChanged.length === 0) {
    lines.push("None.", "");
  } else {
    for (const e of diff.fieldChanged) {
      lines.push(`- \`${e.id}\` **${e.name}** (${e.bucket})`);
      for (const fc of e.fieldChanges) lines.push(`  - **${fc.field}**: ${fmt(fc.old)} -> ${fmt(fc.new)}`);
    }
    lines.push("");
  }

  lines.push("## Known limits of this script", "");
  lines.push(
    "This is a JSON-field diff of foreverchanges' own exported fields. It",
    "cannot see anything that isn't a raw-field change -- it does not re-",
    "derive or compare the fcItemToUnified-mapped LootItem shape, item-",
    "refresh overlays, or tooltip overlays applied later by build-items.js.",
    "",
    "The possible-duplicate check above is a plain exact-name match against",
    "the old pull -- it can't tell a real re-issued-id duplicate from a",
    "coincidentally-identical name (e.g. a generic recipe name reused on a",
    "different tier), so every hit still needs a human to confirm it before",
    "it's added to known-duplicate-ids.json.",
    ""
  );

  return lines.join("\n");
}

function main() {
  const [, , argOld, argNew] = process.argv;
  const oldDir = argOld || ITEMS_DIR;
  const newDir = argNew || ITEMS_DIR;

  // Default usage (no args) diffs the most recently archived pull (see
  // data/sources/foreverchanges/items/archive/<version>-<date>/) against
  // the current untagged files -- before pulling a new update, archive
  // today's four files there first so there's always something to diff
  // against next time.
  const oldPull = argOld
    ? loadPull(oldDir)
    : loadLatestArchivedPull(ARCHIVE_DIR);
  const newPull = argNew ? loadPull(newDir) : loadPull(ITEMS_DIR);

  const oldLabel = pullLabel(oldPull.meta, oldDir);
  const newLabel = pullLabel(newPull.meta, newDir);

  const diff = diffItems(oldPull, newPull);
  const markdown = renderMarkdown({ oldLabel, newLabel, diff });
  const rawDiff = { oldLabel, newLabel, diff };

  fs.mkdirSync(DIFFS_DIR, { recursive: true });
  const safe = (s) => s.replace(/[^\w.-]+/g, "_");
  const base = `${safe(oldLabel)}_to_${safe(newLabel)}`;
  const mdPath = path.join(DIFFS_DIR, `${base}.md`);
  const jsonPath = path.join(DIFFS_DIR, `${base}.json`);
  fs.writeFileSync(mdPath, markdown + "\n", "utf8");
  fs.writeFileSync(jsonPath, JSON.stringify(rawDiff, null, 2) + "\n", "utf8");

  console.log(markdown);
  console.error(`\n(written to ${path.relative(process.cwd(), mdPath)} and ${path.relative(process.cwd(), jsonPath)})`);
}

// Loads the most recently archived pull from
// data/sources/foreverchanges/items/archive/<version>-<date>/ -- folder
// names sort correctly by date since the date (YYYY-MM-DD) is the
// trailing, fixed-width component.
function loadLatestArchivedPull(archiveDir) {
  if (!fs.existsSync(archiveDir)) {
    throw new Error(
      `No archived pulls found at ${archiveDir} -- archive the previous pull's ` +
        `four bucket files there before overwriting them with a new pull, or pass ` +
        `explicit <oldDir> <newDir> args.`
    );
  }
  const dirs = fs
    .readdirSync(archiveDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const latest = dirs[dirs.length - 1];
  if (!latest) {
    throw new Error(`${archiveDir} exists but has no archived pull subfolders.`);
  }
  return loadPull(path.join(archiveDir, latest));
}

main();

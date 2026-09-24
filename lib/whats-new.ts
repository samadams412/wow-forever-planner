import fs from "fs";
import path from "path";

// Reads the structured diff JSON that scripts/diff-talentsforever.js already
// writes to data/sources/talentsforever/diffs/ (see that script and
// data/sources/README.md)
// and turns it into plain-language "what changed" content for /whats-new.
// This deliberately only covers talent add/remove/move/prereq changes --
// the four categories the page's headline breakdown shows -- not every
// field-level diff the script tracks. Most of a typical diff's "changed"
// entries are source-confidence upgrades (complete: false -> true, a desc
// field reshaped from a sparse object to a full per-rank array, an icon
// swap) rather than an actual gameplay change, and lumping those into
// "added/removed/moved/rule-changes" would overstate what actually changed
// for a player reading this page. Those entries are still real and are
// visible in the linked raw diff files; this page just doesn't count them
// in the headline numbers.

const DIFFS_DIR = path.join(process.cwd(), "data", "sources", "talentsforever", "diffs");

type RawTalentRef = {
  className: string;
  treeName: string;
  key: string;
  talent: { name: string; row?: number; col?: number; req?: string };
};

type RawFieldChange = { field: string; old: unknown; new: unknown };

type RawTalentChange = {
  className: string;
  treeName: string;
  name: string;
  fieldChanges: RawFieldChange[];
  allTrivial: boolean;
};

type RawDiff = {
  oldLabel: string;
  newLabel: string;
  talents: {
    added: RawTalentRef[];
    removed: RawTalentRef[];
    changed: RawTalentChange[];
  };
};

export type TalentChangeKind = "added" | "removed" | "moved" | "ruleChanged";

export type TalentChangeEntry = {
  kind: TalentChangeKind;
  className: string; // lowercase classId, e.g. "warrior"
  treeName: string;
  name: string;
  description: string; // plain-language summary, e.g. "moved from row 6 to row 5"
};

export type ClassBreakdown = {
  classId: string;
  added: number;
  removed: number;
  moved: number;
  ruleChanged: number;
  total: number;
  entries: TalentChangeEntry[];
};

export type DiffSummary = {
  oldLabel: string;
  newLabel: string;
  totals: { added: number; removed: number; moved: number; ruleChanged: number; total: number };
  // Real, non-trivial talent field changes this sync that aren't one of the
  // four headline categories above (see the comment at its computation site).
  otherSubstantiveChanges: number;
  byClass: ClassBreakdown[];
};

function fieldChange(changed: RawTalentChange, field: string): RawFieldChange | undefined {
  return changed.fieldChanges.find((fc) => fc.field === field);
}

function summarizeDiff(raw: RawDiff): DiffSummary {
  const byClassMap = new Map<string, ClassBreakdown>();
  let otherSubstantiveChanges = 0;

  function getClass(classNameRaw: string): ClassBreakdown {
    const classId = classNameRaw.toLowerCase();
    let entry = byClassMap.get(classId);
    if (!entry) {
      entry = { classId, added: 0, removed: 0, moved: 0, ruleChanged: 0, total: 0, entries: [] };
      byClassMap.set(classId, entry);
    }
    return entry;
  }

  for (const t of raw.talents.added) {
    const cls = getClass(t.className);
    cls.added++;
    cls.total++;
    cls.entries.push({
      kind: "added",
      className: cls.classId,
      treeName: t.treeName,
      name: t.talent.name,
      description: `new talent in ${t.treeName}${
        t.talent.row != null && t.talent.col != null ? ` (row ${t.talent.row}, col ${t.talent.col})` : ""
      }.`,
    });
  }

  for (const t of raw.talents.removed) {
    const cls = getClass(t.className);
    cls.removed++;
    cls.total++;
    cls.entries.push({
      kind: "removed",
      className: cls.classId,
      treeName: t.treeName,
      name: t.talent.name,
      description: `gone from ${t.treeName}.`,
    });
  }

  for (const c of raw.talents.changed) {
    const cls = getClass(c.className);
    const rowChange = fieldChange(c, "row");
    const colChange = fieldChange(c, "col");
    if (rowChange || colChange) {
      cls.moved++;
      cls.total++;
      const parts: string[] = [];
      if (rowChange) parts.push(`row ${rowChange.old} to row ${rowChange.new}`);
      if (colChange) parts.push(`column ${colChange.old} to column ${colChange.new}`);
      cls.entries.push({
        kind: "moved",
        className: cls.classId,
        treeName: c.treeName,
        name: c.name,
        description: `moved from ${parts.join(", ")} in ${c.treeName}.`,
      });
    }

    const isRowColChange = Boolean(rowChange || colChange);
    const reqChange = fieldChange(c, "req");
    if (reqChange) {
      cls.ruleChanged++;
      cls.total++;
      let description: string;
      if (reqChange.old && !reqChange.new) {
        description = `no longer requires ${String(reqChange.old)}.`;
      } else if (!reqChange.old && reqChange.new) {
        description = `now requires ${String(reqChange.new)}.`;
      } else {
        description = `now requires ${String(reqChange.new)} instead of ${String(reqChange.old)}.`;
      }
      cls.entries.push({
        kind: "ruleChanged",
        className: cls.classId,
        treeName: c.treeName,
        name: c.name,
        description,
      });
    }

    // A talent with real field changes (not just markup/whitespace) that
    // aren't a row/col move or a req change -- e.g. a tooltip number tuned,
    // an icon swapped, a rank's text upgraded from estimated to confirmed.
    // Not one of the four headline categories, but still worth surfacing as
    // a count so a sync dominated by this kind of change (like 09-14 -> 15
    // and 09-15 -> 16, which had zero adds/removes/moves/rule-changes) doesn't
    // read as "nothing happened."
    if (!c.allTrivial && !isRowColChange && !reqChange) {
      otherSubstantiveChanges++;
    }
  }

  const byClass = [...byClassMap.values()]
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const totals = byClass.reduce(
    (acc, c) => ({
      added: acc.added + c.added,
      removed: acc.removed + c.removed,
      moved: acc.moved + c.moved,
      ruleChanged: acc.ruleChanged + c.ruleChanged,
      total: acc.total + c.total,
    }),
    { added: 0, removed: 0, moved: 0, ruleChanged: 0, total: 0 }
  );

  return { oldLabel: raw.oldLabel, newLabel: raw.newLabel, totals, otherSubstantiveChanges, byClass };
}

// Diff files are named "<oldLabel>_to_<newLabel>.json" (see the script);
// sorting by filename sorts chronologically since labels are ISO dates.
function listDiffFiles(): string[] {
  if (!fs.existsSync(DIFFS_DIR)) return [];
  return fs
    .readdirSync(DIFFS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
}

export function getAllDiffSummaries(): DiffSummary[] {
  return listDiffFiles().map((file) => {
    const raw = JSON.parse(fs.readFileSync(path.join(DIFFS_DIR, file), "utf8")) as RawDiff;
    return summarizeDiff(raw);
  });
}

// Most recent pair first for the primary "since your last visit" view;
// callers that want chronological order use getAllDiffSummaries directly.
export function getLatestDiffSummary(): DiffSummary | undefined {
  const all = getAllDiffSummaries();
  return all.length > 0 ? all[all.length - 1] : undefined;
}

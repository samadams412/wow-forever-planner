import fs from "fs";
import path from "path";
import { getClassTalentData, getRacialsForRace } from "@/lib/wow-data";
import { spellbooks } from "@/lib/spellbooks";
import { getClassRacials } from "@/lib/class-racials";
import { formatTooltipText } from "@/lib/tooltip";

// "In Game" data for /whats-new: one hand-authored JSON file per beta build
// under data/patch-notes/ (see that folder's files for the shape). This is
// deliberately NOT generated from the talentsforever diffs -- Blizzard's own
// patch notes are the primary source and carry things a data diff can't
// (developer commentary, non-talent changes, renames explained), while the
// diffs in data/sources/talentsforever/diffs/ remain the source for the
// separate raw "talent data syncs" list at the bottom of the page.
//
// Every entry names a talent/spell/racial; this module resolves that name to
// real site data at build time so the client component can render a hover
// tooltip without shipping the whole talent/spellbook data to the browser.

const NOTES_DIR = path.join(process.cwd(), "data", "patch-notes");

export type NoteKind = "changed" | "fix" | "renamed" | "removed" | "moved" | "new";

export type NoteChange = { label?: string; before: string; after: string };

type RawEntry = {
  name: string;
  // Display name when it differs from the lookup name (e.g. lookup
  // "Sacrifice", show "Voidwalker Sacrifice").
  label?: string;
  kind: NoteKind;
  spec?: string; // "Holy", "Feral", "Pets" -- a small caption, not a filter
  race?: string; // a class racial spell, e.g. Priest's Gnome "Contingency Plan"
  raceId?: string; // a general racial: key into data/racials.json
  oldName?: string;
  text: string;
  changes?: NoteChange[];
  // Blizzard's own "Developers' notes" text, kept verbatim.
  devNote?: string;
};

type RawOther = {
  heading: string;
  points: { text: string; links?: { label: string; href: string }[] }[];
};

type RawBuild = {
  build: string;
  date: string;
  title: string;
  summary: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceNote: string;
  // Changes in the notes that our planner data doesn't reflect yet.
  pendingInData?: string[];
  classes: Record<string, RawEntry[]>;
  races: RawEntry[];
  other: RawOther[];
};

export type ResolvedRef = {
  kind: "talent" | "spell" | "racial";
  name: string;
  icon: string | null;
  subtitle: string;
  typeLine: string | null;
  description: string;
  href: string;
};

export type NoteEntry = RawEntry & { ref: ResolvedRef | null };

export type PatchBuild = Omit<RawBuild, "classes" | "races"> & {
  classes: Record<string, NoteEntry[]>;
  races: NoteEntry[];
  entryCount: number;
};

function classDisplay(classId: string) {
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

function resolveRef(entry: RawEntry, classId: string | null): ResolvedRef | null {
  if (entry.raceId) {
    const racial = getRacialsForRace(entry.raceId).find((r) => r.name === entry.name);
    if (!racial) return null;
    return {
      kind: "racial",
      name: racial.name,
      icon: racial.icon ?? null,
      subtitle: `${entry.race ?? "Racial"} racial`,
      typeLine: racial.type === "active" ? "Active" : "Passive",
      description: formatTooltipText(racial.description),
      href: "/reference/racials",
    };
  }
  if (!classId) return null;

  if (entry.race) {
    const spell = getClassRacials(classId)?.races[entry.race]?.find((s) => s.name === entry.name);
    if (!spell) return null;
    return {
      kind: "racial",
      name: spell.name,
      icon: spell.icon,
      subtitle: `${entry.race} ${classDisplay(classId)} racial spell`,
      typeLine: spell.meta ?? null,
      description: formatTooltipText(spell.description),
      href: "/reference/racials",
    };
  }

  // Talent first (its tooltip is the max-rank text), then a trainer spell.
  const talentData = getClassTalentData(classId);
  for (const tree of talentData?.trees ?? []) {
    const t = tree.talents.find((x) => x.name === entry.name);
    if (t) {
      return {
        kind: "talent",
        name: t.name,
        icon: t.icon,
        subtitle: `${tree.name} talent · ${t.maxRank} rank${t.maxRank === 1 ? "" : "s"}`,
        typeLine: t.cost ?? null,
        description: formatTooltipText(t.ranks[t.ranks.length - 1]),
        href: `/planner/${classId}`,
      };
    }
  }

  const book = spellbooks.classes[classId];
  for (const tab of book?.tabs ?? []) {
    const spell = tab.spells.find((s) => s.name === entry.name);
    const last = spell?.ranks?.[spell.ranks.length - 1];
    if (spell && last) {
      return {
        kind: "spell",
        name: spell.name,
        icon: spell.icon ?? null,
        subtitle: `${classDisplay(classId)} spell${last.rank ? ` · highest rank ${last.rank}` : ""}`,
        typeLine: last.lines[0] ? last.lines[0].filter(Boolean).join(" · ") : null,
        description: formatTooltipText(last.description),
        href: "/reference/class-spellbooks",
      };
    }
  }
  return null;
}

function resolveEntries(entries: RawEntry[], classId: string | null): NoteEntry[] {
  return entries.map((e) => ({ ...e, ref: resolveRef(e, classId) }));
}

function loadBuild(file: string): PatchBuild {
  const raw = JSON.parse(fs.readFileSync(path.join(NOTES_DIR, file), "utf8")) as RawBuild;
  const classes: Record<string, NoteEntry[]> = {};
  for (const [classId, entries] of Object.entries(raw.classes)) {
    classes[classId] = resolveEntries(entries, classId);
  }
  const races = resolveEntries(raw.races, null);
  const entryCount = Object.values(classes).reduce((n, e) => n + e.length, 0) + races.length;
  return { ...raw, classes, races, entryCount };
}

// Newest build first (build numbers and dates both sort this way).
export function getPatchBuilds(): PatchBuild[] {
  if (!fs.existsSync(NOTES_DIR)) return [];
  return fs
    .readdirSync(NOTES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map(loadBuild)
    .sort((a, b) => (a.date === b.date ? b.build.localeCompare(a.build) : b.date.localeCompare(a.date)));
}

// Site changelog ("On the Site"): hand-authored, see data/site-changelog.json.
export type SiteChangelogEntry = {
  date: string;
  title: string;
  points: string[];
  link?: { label: string; href: string };
};

export function getSiteChangelog(): SiteChangelogEntry[] {
  const file = path.join(process.cwd(), "data", "site-changelog.json");
  if (!fs.existsSync(file)) return [];
  const entries = JSON.parse(fs.readFileSync(file, "utf8")) as SiteChangelogEntry[];
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}

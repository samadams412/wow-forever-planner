import fs from "fs";
import path from "path";
import type { LootItem } from "@/lib/dungeon-loot";

// Reads data/professions-catalog/<id>.json, built by scripts/build-professions.js
// from the raw data/professions/*.json recipe lists (plus the leveling/
// merchants-favor files for Alchemy and Blacksmithing) -- see that script's
// header comment for the full pipeline (item-name resolution against the
// full item catalog, per-profession categorization, the uncertain-category
// report). This is a plain fs + module-level cache reader, same pattern as
// lib/dungeon-loot.ts and lib/items.ts.
//
// Every item reference here is a full LootItem, not a slim {id, icon, name}
// ref -- every item on this site renders through the one shared
// LootItemPill component (see Part A's site-wide item-linking work), so a
// recipe's crafted item and its reagents carry the same shape that
// component already expects (full tooltip text, status, etc.), including
// the `unknown: true` fallback for a name that didn't resolve against the
// item catalog at all.

export type SkillColors = { orange: string; yellow: string; green: string; grey: string };

export type Recipe = {
  name: string;
  rank: string;
  category: string;
  categoryConfident: boolean;
  source: string;
  skills: SkillColors;
  item: LootItem;
  makesQty: number | null;
  reagents: { qty: number; name: string; item: LootItem }[];
};

export type LevelingStep = {
  range: [number, number];
  item: LootItem;
  source: string;
  count: string;
  mats: { qty: number; item: LootItem }[];
};

export type LevelingRank = {
  rank: string;
  requirement: string;
  steps: LevelingStep[];
};

export type FavorItem = {
  item: LootItem;
  skillThreshold: number;
  skills: SkillColors | null;
};

export type FavorTier = {
  tier: string;
  items: FavorItem[];
};

// One entry in either "Legacy points and title" (milestones -- skill-rank
// titles plus the account-wide Certification) or "At camp" (campObjects --
// placeable camp objects, each unlocked at a skill threshold). Same shape
// either way: item is the real linked item when there is one (every camp
// object and the Certification; a plain skill-rank milestone has none, so
// item falls back to the site's usual unresolved-item rendering).
export type CampMilestone = {
  name: string;
  // The row's own trade/profession icon slug, for a plain skill-rank
  // milestone with no real linked item (null once `item` is non-null --
  // that item's own icon is what renders then).
  icon: string | null;
  description: string;
  legacyPoints: string | null;
  skill: number | null;
  item: LootItem | null;
  blueprint: LootItem | null;
};

// A Legacy Perk relevant to this profession page -- NOT profession-specific
// data (foreverchanges.pro shows the identical 3 "Professions" Legacy tree
// perks on every profession's page); reused directly from
// data/legacy-perks.json rather than duplicated per profession. Kept as a
// loose shape here (this project's LegacyPerk type lives with the Legacy
// Perks reference page, not this module) since only name/description/
// meta fields are rendered on the profession page, not the full tree
// interaction data.
export type CampLegacyPerk = {
  id: string;
  name: string;
  icon: string;
  maxRank: number;
  gate: number;
  prereqName: string | null;
  // The max-rank (fully invested) effect text -- this is a static summary
  // list, not the interactive per-rank tree /reference/legacy-perks is.
  description: string;
};

export type CampSection = {
  milestones: CampMilestone[];
  campObjects: CampMilestone[];
  legacyPerks: CampLegacyPerk[];
};

export type ProfessionCatalog = {
  id: string;
  name: string;
  categories: string[];
  recipes: Recipe[];
  leveling: LevelingRank[] | null;
  favor: FavorTier[] | null;
  camp: CampSection | null;
};

const CATALOG_DIR = path.join(process.cwd(), "data", "professions-catalog");

let idCache: string[] | null = null;

export function getProfessionIds(): string[] {
  if (idCache) return idCache;
  if (!fs.existsSync(CATALOG_DIR)) return (idCache = []);
  idCache = fs
    .readdirSync(CATALOG_DIR)
    .filter((f) => f.endsWith(".json") && f !== "uncertain.json")
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
  return idCache;
}

// Eagerly computed at module load -- safe here since this module only ever
// runs server-side (read by sitemap.ts and the profession pages), same as
// every other data/*.json reader on this site.
export const PROFESSION_IDS = getProfessionIds();

const catalogCache = new Map<string, ProfessionCatalog>();

export function getProfessionCatalog(id: string): ProfessionCatalog | undefined {
  if (catalogCache.has(id)) return catalogCache.get(id);
  const filePath = path.join(CATALOG_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return undefined;
  const catalog = JSON.parse(fs.readFileSync(filePath, "utf8")) as ProfessionCatalog;
  catalogCache.set(id, catalog);
  return catalog;
}

export function getAllProfessionSummaries(): { id: string; name: string; recipeCount: number; hasLeveling: boolean }[] {
  return getProfessionIds()
    .map((id) => {
      const catalog = getProfessionCatalog(id);
      if (!catalog) return undefined;
      return {
        id: catalog.id,
        name: catalog.name,
        recipeCount: catalog.recipes.length,
        hasLeveling: catalog.leveling !== null,
      };
    })
    .filter((p): p is { id: string; name: string; recipeCount: number; hasLeveling: boolean } => p !== undefined);
}

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
// Recipe, reagent, and leveling data store itemId/name references and are
// hydrated from data/items.json by lib/profession-utils.ts when rendered.
// Favor and camp entries still use full LootItem data until separately migrated.

export type SkillColors = { orange: string; yellow: string; green: string; grey: string };

export type ProfessionItemRef = { itemId: number | null; name: string };

export type Recipe = {
  name: string;
  rank: string;
  category: string;
  categoryConfident: boolean;
  source: string;
  skills: SkillColors;
  item: ProfessionItemRef;
  makesQty: number | null;
  reagents: { qty: number; item: ProfessionItemRef }[];
};

// Persist only the stable catalog id and a display-name fallback in leveling
// data. Enchanting instructions and a few scraped actions have no item id.
export type LevelingMaterialRef = { qty: number; item: ProfessionItemRef };

export type ResolvedRecipe = Omit<Recipe, "item" | "reagents"> & {
  item: LootItem;
  reagents: { qty: number; item: LootItem }[];
};

export type LevelingStep = {
  range: [number, number];
  item: ProfessionItemRef;
  source: string;
  count: string;
  notes?: string;
  mats: LevelingMaterialRef[];
  alternatives?: { // optional, only present for steps that have a known alternative recipe
    item: ProfessionItemRef;
    source: string;
    count: string;
    mats: LevelingMaterialRef[];
  }[];
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
  // false only for First Aid, confirmed to have no Merchant's Favor
  // vendor at all on foreverchanges.pro -- distinct from favor === null
  // elsewhere, which means "not yet scraped" and should still show a
  // coming-soon tab rather than hide it.
  favorSupported: boolean;
  camp: CampSection | null;
};

const CATALOG_DIR = path.join(process.cwd(), "data", "professions-catalog");

// Mining/Herbalism/Skinning live in this same directory (data/professions-
// catalog/) but are a different shape entirely -- see lib/gathering-
// professions.ts's header comment -- so every crafting-only reader below
// (which assumes catalog.recipes, catalog.categories, etc.) must not pick
// them up. Excluded by id here rather than by probing each file's shape,
// since the 3 ids are fixed and known.
const GATHERING_IDS = new Set(["mining", "herbalism", "skinning"]);

let idCache: string[] | null = null;

export function getProfessionIds(): string[] {
  if (idCache) return idCache;
  if (!fs.existsSync(CATALOG_DIR)) return (idCache = []);
  idCache = fs
    .readdirSync(CATALOG_DIR)
    .filter((f) => f.endsWith(".json") && f !== "uncertain.json")
    .map((f) => f.replace(/\.json$/, ""))
    .filter((id) => !GATHERING_IDS.has(id))
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

export function getAllProfessionSummaries(): { id: string; name: string; recipeCount: number }[] {
  return getProfessionIds()
    .map((id) => {
      const catalog = getProfessionCatalog(id);
      if (!catalog) return undefined;
      return {
        id: catalog.id,
        name: catalog.name,
        recipeCount: catalog.recipes.length,
      };
    })
    .filter((p): p is { id: string; name: string; recipeCount: number } => p !== undefined);
}

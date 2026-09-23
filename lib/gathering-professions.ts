import fs from "fs";
import path from "path";
import type { LootItem } from "@/lib/dungeon-loot";
import type { CampSection } from "@/lib/profession-recipes";

// Reads data/professions-catalog/{mining,herbalism,skinning}.json, built by
// scripts/build-gathering-professions.js -- a separate reader from
// lib/profession-recipes.ts's crafting-profession one, since these 3 pages
// have a genuinely different shape (no reagent-based recipes, no category
// sidebar, no Merchant's Favor, no Legacy-point milestone track -- see
// scripts/lib/parse-gathering-page.js's header comment for what was
// actually checked live before assuming this). `camp` reuses
// profession-recipes.ts's CampSection type -- the #camp chapter really is
// identical between crafting and gathering pages.

export type SkillColors = { orange: string; yellow: string; green: string; grey: string };

export type GatheringNode = {
  name: string;
  icon: string | null;
  zones: string;
  items: LootItem[];
  skills: SkillColors | null;
};

// Mining/Herbalism's Leveling steps (icons point back at named nodes, no
// item of their own -- see buildStep's comment in build-gathering-
// professions.js) and Skinning's single band list (items carries real
// loot directly, icons empty) share this one shape.
export type GatheringStep = {
  range: [number, number | null];
  name: string;
  zones: string;
  icons: { icon: string; name: string }[];
  items: LootItem[];
};

export type SmeltingRecipe = {
  name: string;
  makesQty: number | null;
  item: LootItem;
  mats: LootItem[];
  skills: SkillColors | null;
  source: string;
};

export type GatheringCatalog = {
  id: string;
  name: string;
  kind: "gathering";
  nodes: GatheringNode[] | null;
  leveling: GatheringStep[] | null;
  skin: GatheringStep[] | null;
  smelting: SmeltingRecipe[] | null;
  camp: CampSection | null;
};

const CATALOG_DIR = path.join(process.cwd(), "data", "professions-catalog");
export const GATHERING_PROFESSION_IDS = ["mining", "herbalism", "skinning"] as const;

const catalogCache = new Map<string, GatheringCatalog>();

export function getGatheringCatalog(id: string): GatheringCatalog | undefined {
  if (catalogCache.has(id)) return catalogCache.get(id);
  const filePath = path.join(CATALOG_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return undefined;
  const catalog = JSON.parse(fs.readFileSync(filePath, "utf8")) as GatheringCatalog;
  catalogCache.set(id, catalog);
  return catalog;
}

export function isGatheringProfessionId(id: string): boolean {
  return (GATHERING_PROFESSION_IDS as readonly string[]).includes(id);
}

export function getAllGatheringSummaries(): { id: string; name: string; itemCount: number }[] {
  return GATHERING_PROFESSION_IDS.map((id) => {
    const catalog = getGatheringCatalog(id);
    if (!catalog) return undefined;
    // "Item count" means something different per profession (nodes for
    // Mining/Herbalism, level bands for Skinning) -- there's no single
    // "recipes" concept the way crafting professions have.
    const itemCount = catalog.nodes?.length ?? catalog.skin?.length ?? 0;
    return { id: catalog.id, name: catalog.name, itemCount };
  }).filter((p): p is { id: string; name: string; itemCount: number } => p !== undefined);
}

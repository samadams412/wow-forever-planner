"use client";

import { useMemo, useState } from "react";
import { Clipboard, ChevronDown, ChevronRight, Minus, Plus } from "lucide-react";
import Link from "next/link";
import LootItemPill from "@/components/reference/LootItemPill";
import LootItemIcon from "@/components/reference/LootItemIcon";
import { itemQualityColor, mediumIconUrl } from "@/lib/wow-data";
import { PROFESSION_ICON } from "@/lib/profession-icons";
import type { LootItem } from "@/lib/dungeon-loot";

export type CalculatorItem = LootItem;
export type CalculatorRecipe = {
  id: string;
  name: string;
  category: string;
  outputKey: string;
  makesQty: number | null;
  reagents: { key: string; qty: number }[];
};
export type CalculatorProfession = { id: string; name: string; recipes: CalculatorRecipe[] };

type RecipeChoice = CalculatorRecipe & { professionId: string };
// Keep high-value / commonly gathered materials as inputs rather than
// expanding catalog conversions that are impractical for a shopping plan:
// leather tiers, essence transmutes, and Gold/Truesilver bar recipes.
const NON_RECURSIVE_ITEM_KEYS = new Set([
  "id:8170", "id:4304", "id:4234", "id:2319", "id:2318", // leather tiers
  "id:12803", "id:12808", // Living Essence, Essence of Undeath
  "id:7078", "id:7076", "id:7080", "id:7082", // elemental essences
  "id:3577", "id:6037", // Gold Bar, Truesilver Bar
]);
const ENCHANTING_ROD_KEYS = new Set(["id:6217", "id:6338", "id:11128", "id:11144", "id:16206"]);

type PlanNode = {
  key: string;
  quantity: number;
  recipe?: RecipeChoice;
  batches?: number;
  output?: number;
  cycle?: boolean;
  reusable?: boolean;
  children: PlanNode[];
};

type CrossProfessionCraft = {
  key: string;
  professionId: string;
  recipe: RecipeChoice;
  quantity: number;
  ingredients: Map<string, number>;
};

function makePlan(
  key: string,
  quantity: number,
  recipesByOutput: Map<string, RecipeChoice[]>,
  preferredProfession: string,
  path: Set<string>,
  expand: boolean,
  onlySelectedProfession: boolean,
): PlanNode {
  if (NON_RECURSIVE_ITEM_KEYS.has(key)) return { key, quantity, children: [] };
  const choices = recipesByOutput.get(key) ?? [];
  const recipe = expand
    ? choices.find((candidate) => candidate.professionId === preferredProfession) ?? (onlySelectedProfession ? undefined : choices[0])
    : undefined;
  if (!recipe || path.has(key)) return { key, quantity, cycle: path.has(key), children: [] };

  const outputPerBatch = Math.max(1, recipe.makesQty ?? 1);
  const batches = Math.ceil(quantity / outputPerBatch);
  const nextPath = new Set(path).add(key);
  return {
    key,
    quantity,
    recipe,
    batches,
    output: batches * outputPerBatch,
    children: makeRecipeChildren(recipe, batches, recipesByOutput, preferredProfession, nextPath, expand, onlySelectedProfession),
  };
}

function makeRecipeChildren(
  recipe: RecipeChoice,
  batches: number,
  recipesByOutput: Map<string, RecipeChoice[]>,
  preferredProfession: string,
  path: Set<string>,
  expand: boolean,
  onlySelectedProfession: boolean,
): PlanNode[] {
  return recipe.reagents.map((reagent) => {
    const quantity = reagent.qty * batches;
    // Enchanters keep one of each permanent rod; show it as a direct input
    // instead of recursively calculating the Blacksmithing rod recipe.
    if (recipe.professionId === "enchanting" && ENCHANTING_ROD_KEYS.has(reagent.key)) {
      return { key: reagent.key, quantity: 1, reusable: true, children: [] };
    }
    return makePlan(reagent.key, quantity, recipesByOutput, preferredProfession, path, expand, onlySelectedProfession);
  });
}

function makeRootPlan(
  recipe: RecipeChoice,
  quantity: number,
  recipesByOutput: Map<string, RecipeChoice[]>,
  preferredProfession: string,
  expand: boolean,
  onlySelectedProfession: boolean,
): PlanNode {
  const outputPerBatch = Math.max(1, recipe.makesQty ?? 1);
  const batches = Math.ceil(quantity / outputPerBatch);
  return {
    key: recipe.outputKey,
    quantity,
    recipe,
    batches,
    output: batches * outputPerBatch,
    children: makeRecipeChildren(recipe, batches, recipesByOutput, preferredProfession, new Set([recipe.outputKey]), expand, onlySelectedProfession),
  };
}

function addTotal(totals: Map<string, number>, key: string, quantity: number) {
  totals.set(key, (totals.get(key) ?? 0) + quantity);
}

function collectTotals(
  node: PlanNode,
  raw: Map<string, number>,
  intermediates: Map<string, number>,
  isRoot = false,
) {
  if (!node.recipe) {
    if (node.reusable) raw.set(node.key, 1);
    else addTotal(raw, node.key, node.quantity);
    return;
  }
  if (!isRoot) addTotal(intermediates, node.key, node.quantity);
  node.children.forEach((child) => collectTotals(child, raw, intermediates));
}

function collectCrossProfessionCrafts(nodes: PlanNode[], currentProfessionId: string) {
  const crafts = new Map<string, CrossProfessionCraft>();
  function visit(node: PlanNode) {
    if (node.recipe && node.recipe.professionId !== currentProfessionId) {
      const key = `${node.recipe.professionId}:${node.key}`;
      const craft = crafts.get(key) ?? {
        key,
        professionId: node.recipe.professionId,
        recipe: node.recipe,
        quantity: 0,
        ingredients: new Map<string, number>(),
      };
      craft.quantity += node.quantity;
      for (const ingredient of node.children) {
        addTotal(craft.ingredients, ingredient.key, ingredient.quantity);
      }
      crafts.set(key, craft);
    }
    node.children.forEach(visit);
  }
  nodes.forEach(visit);
  return [...crafts.values()];
}

function MaterialRow({
  item,
  quantity,
  tooltipId,
  optionalProfessions = [],
}: {
  item: LootItem;
  quantity: number;
  tooltipId: string;
  optionalProfessions?: { id: string; name: string }[];
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-b border-border/60 py-2 last:border-b-0">
      <div className="min-w-0">
        <LootItemPill item={item} tooltipId={tooltipId} context="catalog" qty={quantity} />
        {!item.icon && quantity > 1 && (
          <span className="ml-2 font-mono text-xs tabular-nums text-foreground-muted">×{quantity.toLocaleString()}</span>
        )}
        {optionalProfessions.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-foreground-muted">
            <span>Optional craft:</span>
            {optionalProfessions.map((profession) => (
              <Link
                key={profession.id}
                href={`/reference/professions/${profession.id}`}
                title={`Craft with ${profession.name}`}
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                {PROFESSION_ICON[profession.id] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediumIconUrl(PROFESSION_ICON[profession.id])} alt="" className="h-4 w-4 rounded-sm" />
                )}
                {profession.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlanTree({
  node,
  items,
  professionNames,
  currentProfessionId,
  depth = 0,
  id,
}: {
  node: PlanNode;
  items: Record<string, LootItem>;
  professionNames: Record<string, string>;
  currentProfessionId: string;
  depth?: number;
  id: string;
}) {
  const item = items[node.key];
  if (!item) return null;
  const recipe = node.recipe;
  const isCrossProfession = recipe !== undefined && recipe.professionId !== currentProfessionId;
  const professionName = recipe ? professionNames[recipe.professionId] ?? recipe.professionId : "";
  return (
    <li className="min-w-0" style={{ marginLeft: depth ? `${Math.min(depth, 5) * 1.25}rem` : undefined }}>
      <div className="flex flex-wrap items-center gap-2 py-1.5">
        <LootItemPill item={item} tooltipId={`${id}:${node.key}:${depth}`} context="catalog" />
        <span className="text-xs text-foreground-muted">Need {node.quantity.toLocaleString()}</span>
        {recipe && <span className="text-xs text-foreground-muted">· craft {node.batches}× ({node.output} made)</span>}
        {recipe && isCrossProfession && (
          <Link
            href={`/reference/professions/${recipe.professionId}`}
            title={`${professionName} recipe: ${recipe.name}`}
            aria-label={`View ${professionName} recipe for ${recipe.name}`}
            className="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent hover:border-accent"
          >
            {PROFESSION_ICON[recipe.professionId] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediumIconUrl(PROFESSION_ICON[recipe.professionId])} alt="" className="h-4 w-4 rounded-sm" />
            )}
            {professionName}
          </Link>
        )}
        {node.cycle && <span className="text-xs text-amber-300">· recipe loop; counted as a gathered material</span>}
      </div>
      {node.children.length > 0 && (
        <ul className="border-l border-border/70 pl-2">
          {node.children.map((child, index) => (
            <PlanTree
              key={`${child.key}:${index}`}
              node={child}
              items={items}
              professionNames={professionNames}
              currentProfessionId={currentProfessionId}
              depth={depth + 1}
              id={id}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function CraftingCalculator({
  professions: catalogProfessions,
  items,
}: {
  professions: CalculatorProfession[];
  items: Record<string, CalculatorItem>;
}) {
  // Recipes are shown alphabetically everywhere (drop-down, first load, and
  // after a profession swap), so sort a copy once. Array.sort is stable, so
  // same-name recipes keep catalog (rank) order. Plan lookups below still use
  // the catalog order via `catalogProfessions`.
  const professions = useMemo(() => catalogProfessions.map((profession) => ({
    ...profession,
    recipes: [...profession.recipes].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
  })), [catalogProfessions]);
  const [professionId, setProfessionId] = useState(professions[0]?.id ?? "");
  const [recipeId, setRecipeId] = useState(professions[0]?.recipes[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [showChoices, setShowChoices] = useState(false);
  const [category, setCategory] = useState("All categories");
  const [quantity, setQuantity] = useState(1);
  const [expand, setExpand] = useState(true);
  const [onlySelectedProfession, setOnlySelectedProfession] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedProfession = professions.find((profession) => profession.id === professionId) ?? professions[0];
  const selectedRecipe = selectedProfession?.recipes.find((recipe) => recipe.id === recipeId) ?? selectedProfession?.recipes[0];
  const choices = useMemo(() => catalogProfessions.flatMap((profession) => profession.recipes.map((recipe) => ({ ...recipe, professionId: profession.id }))), [catalogProfessions]);
  const recipesByOutput = useMemo(() => {
    const index = new Map<string, RecipeChoice[]>();
    for (const choice of choices) {
      const matches = index.get(choice.outputKey) ?? [];
      if (!matches.some((candidate) => candidate.professionId === choice.professionId)) matches.push(choice);
      index.set(choice.outputKey, matches);
    }
    return index;
  }, [choices]);
  const matchingRecipes = selectedProfession?.recipes.filter((recipe) =>
    (category === "All categories" || recipe.category === category) &&
    `${recipe.name} ${items[recipe.outputKey]?.name ?? ""} ${recipe.category}`.toLowerCase().includes(query.trim().toLowerCase()),
  ) ?? [];
  const categories = [...new Set(selectedProfession?.recipes.map((recipe) => recipe.category) ?? [])].sort((a, b) => a.localeCompare(b));

  const plan = useMemo(() => selectedRecipe
    ? makeRootPlan({ ...selectedRecipe, professionId: selectedProfession?.id ?? professionId }, quantity, recipesByOutput, professionId, expand, onlySelectedProfession)
    : null, [selectedRecipe, selectedProfession?.id, quantity, recipesByOutput, professionId, expand, onlySelectedProfession]);
  const totals = useMemo(() => {
    const raw = new Map<string, number>();
    const intermediates = new Map<string, number>();
    if (plan) plan.children.forEach((node) => collectTotals(node, raw, intermediates));
    const byName = (a: [string, number], b: [string, number]) => (items[a[0]]?.name ?? a[0]).localeCompare(items[b[0]]?.name ?? b[0]);
    return { raw: [...raw].sort(byName), intermediates: [...intermediates].sort(byName) };
  }, [plan, items]);
  const professionNames = Object.fromEntries(professions.map((profession) => [profession.id, profession.name]));
  const crossProfessionCrafts = plan ? collectCrossProfessionCrafts(plan.children, professionId) : [];

  function changeProfession(nextId: string) {
    const next = professions.find((profession) => profession.id === nextId);
    setProfessionId(nextId);
    setRecipeId(next?.recipes[0]?.id ?? "");
    setQuery("");
    setShowChoices(false);
    setCategory("All categories");
  }

  async function copyMaterials() {
    if (!selectedRecipe) return;
    const lines = [
      `Materials for ${quantity} × ${selectedRecipe.name} (${selectedProfession?.name})`,
      ...totals.raw.map(([key, amount]) => `${amount} × ${items[key]?.name ?? key}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  if (!selectedProfession || !selectedRecipe) return <p className="rounded border border-border bg-surface p-4 text-sm text-foreground-muted">No profession recipes are available.</p>;

  const outputItem = items[selectedRecipe.outputKey];
  const batches = Math.ceil(quantity / Math.max(1, selectedRecipe.makesQty ?? 1));
  const produced = batches * Math.max(1, selectedRecipe.makesQty ?? 1);

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Link href={`/reference/professions/${selectedProfession.id}`} className="text-sm text-accent hover:underline">
          Browse all {selectedProfession.name} recipes →
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.6fr)]">
        <section className="h-fit rounded-lg border border-border bg-surface p-4 sm:p-5">
          <h2 className="font-heading text-lg font-semibold text-accent">Plan a craft</h2>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-foreground-muted" htmlFor="craft-profession">Profession</label>
        <select id="craft-profession" value={selectedProfession.id} onChange={(event) => changeProfession(event.target.value)} className="mt-1.5 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent">
          {professions.map((profession) => <option key={profession.id} value={profession.id}>{profession.name}</option>)}
        </select>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-foreground-muted" htmlFor="craft-category">Recipe category</label>
        <select id="craft-category" value={category} onChange={(event) => { setCategory(event.target.value); setShowChoices(true); }} className="mt-1.5 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent">
          <option>All categories</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value} ({selectedProfession.recipes.filter((recipe) => recipe.category === value).length})
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-foreground-muted" htmlFor="craft-recipe">Search recipe by name</label>
        <div className="relative mt-1.5">
          <input
            id="craft-recipe"
            type="search"
            value={showChoices ? query : selectedRecipe.name}
            onFocus={() => { setQuery(""); setShowChoices(true); }}
            onChange={(event) => { setQuery(event.target.value); setShowChoices(true); }}
            onBlur={(event) => {
              // On touch browsers the input blurs before the option's click
              // fires, and relatedTarget is commonly null. Delay dismissal so
              // the option can receive that click and update the selection.
              const container = event.currentTarget.parentElement;
              const nextTarget = event.relatedTarget as Node | null;
              if (!container?.contains(nextTarget)) {
                window.setTimeout(() => {
                  if (!container?.contains(document.activeElement)) setShowChoices(false);
                }, 250);
              }
            }}
            onKeyDown={(event) => { if (event.key === "Escape") setShowChoices(false); }}
            placeholder="Type an item or recipe name…"
            autoComplete="off"
            className="w-full rounded border border-border bg-background px-3 py-2 pr-9 text-sm text-foreground outline-none placeholder:text-foreground-muted/70 focus:border-accent"
            aria-controls="craft-recipe-options"
            aria-expanded={showChoices}
          />
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-foreground-muted" />
          {showChoices && (
            <ul id="craft-recipe-options" className="craft-recipe-options absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded border border-border bg-surface shadow-xl" role="listbox">
              {matchingRecipes.length ? matchingRecipes.map((recipe) => {
                const item = items[recipe.outputKey];
                return (
                  <li key={recipe.id}>
                    <button type="button" role="option" aria-selected={recipe.id === selectedRecipe.id} onClick={() => { setRecipeId(recipe.id); setQuery(""); setShowChoices(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-hover">
                      {item?.icon && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediumIconUrl(item.icon)} alt="" className="h-7 w-7 rounded-sm" />
                      )}
                      <span
                        className="min-w-0 flex-1 truncate"
                        style={item && item.quality !== null ? { color: itemQualityColor(item.quality) } : undefined}
                      >
                        {recipe.name}
                      </span>
                      <span className="text-xs text-foreground-muted">{recipe.category}</span>
                    </button>
                  </li>
                );
              }) : <li className="px-3 py-3 text-sm text-foreground-muted">No matching recipes.</li>}
            </ul>
          )}
        </div>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-foreground-muted" htmlFor="craft-quantity">Desired quantity</label>
        <div className="mt-1.5 flex max-w-56 items-stretch overflow-hidden rounded border border-border bg-background">
          <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="px-3 text-foreground-muted hover:bg-surface-hover hover:text-foreground"><Minus className="h-4 w-4" /></button>
          <input id="craft-quantity" type="number" min={1} max={999999} value={quantity} onChange={(event) => setQuantity(Math.min(999999, Math.max(1, Number(event.target.value) || 1)))} className="craft-quantity-input w-full min-w-0 border-x border-border bg-transparent px-2 py-2 text-center font-mono text-sm text-foreground outline-none" />
          <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(999999, value + 1))} className="px-3 text-foreground-muted hover:bg-surface-hover hover:text-foreground"><Plus className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded border border-border/70 bg-background/60 p-3">
          {outputItem && <LootItemIcon item={outputItem} tooltipId="craft-selected-output" context="catalog"  size="large" />}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selectedRecipe.name}</p>
            <p className="text-xs text-foreground-muted">{batches.toLocaleString()} {batches === 1 ? "craft" : "crafts"} · {produced.toLocaleString()} produced{produced > quantity ? ` (${produced - quantity} extra)` : ""}</p>
          </div>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-foreground-muted">
          <input type="checkbox" checked={expand} onChange={(event) => setExpand(event.target.checked)} className="mt-0.5 accent-[var(--gold)]" />
          <span>Break down craftable components recursively</span>
        </label>
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-foreground-muted">
          <input type="checkbox" checked={onlySelectedProfession} onChange={(event) => setOnlySelectedProfession(event.target.checked)} className="mt-0.5 accent-[var(--gold)]" />
          <span>
            Only expand {selectedProfession.name} recipes
            <span className="mt-0.5 block text-xs">Other professions’ crafts stay listed as direct materials.</span>
          </span>
        </label>
        </section>

      <div className="space-y-4">
        {crossProfessionCrafts.length > 0 && (
          <aside className="rounded-lg border border-accent/40 bg-accent/5 p-4 sm:p-5" aria-label="Cross-profession crafting notes">
            <h2 className="font-heading text-base font-semibold text-accent">Cross-profession crafts in this plan</h2>
            <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
              The calculator assumes you make these components with the listed profession. Their ingredients are included in the totals below; if you buy or already have the finished component, those ingredients are optional.
            </p>
            <ul className="mt-3 space-y-2">
              {crossProfessionCrafts.map((craft) => {
                const professionName = professionNames[craft.professionId] ?? craft.professionId;
                const ingredients = [...craft.ingredients].map(([key, amount]) => `${amount.toLocaleString()} × ${items[key]?.name ?? key}`).join(", ");
                return (
                  <li key={craft.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <Link
                      href={`/reference/professions/${craft.professionId}`}
                      className="inline-flex items-center gap-1.5 text-accent hover:underline"
                      title={`View ${professionName} recipes`}
                    >
                      {PROFESSION_ICON[craft.professionId] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediumIconUrl(PROFESSION_ICON[craft.professionId])} alt="" className="h-5 w-5 rounded-sm" />
                      )}
                      <span>{professionName}</span>
                    </Link>
                    <span className="text-foreground">{items[craft.recipe.outputKey]?.name ?? craft.recipe.name} ×{craft.quantity.toLocaleString()}</span>
                    {ingredients && <span className="text-xs text-foreground-muted">· uses {ingredients}</span>}
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
        <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold text-accent">Raw materials</h2>
              <p className="mt-1 text-xs text-foreground-muted">Final materials after the selected breakdown. Optional craft links show professions that can make a listed item.</p>
            </div>
            <button type="button" onClick={copyMaterials} className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-xs font-medium text-foreground-muted transition-colors hover:border-accent hover:text-accent">
              <Clipboard className="h-4 w-4" />{copied ? "Copied" : "Copy list"}
            </button>
          </div>
          {totals.raw.length ? (
            <div className="mt-3 grid gap-x-4 lg:grid-cols-2">
              {totals.raw.map(([key, amount]) => {
                const optionalIds = [...new Set((recipesByOutput.get(key) ?? []).map((recipe) => recipe.professionId))];
                const optionalProfessions = optionalIds.map((id) => ({ id, name: professionNames[id] ?? id }));
                return items[key] ? (
                  <MaterialRow
                    key={key}
                    item={items[key]}
                    quantity={amount}
                    tooltipId={`craft-raw:${key}`}
                    optionalProfessions={optionalProfessions}
                  />
                ) : null;
              })}
            </div>
          ) : <p className="mt-3 rounded border border-border/70 p-3 text-sm text-foreground-muted">No reagents are listed for this recipe.</p>}
        </section>

        {expand && totals.intermediates.length > 0 && (
          <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
            <h2 className="font-heading text-lg font-semibold text-accent">Intermediate crafts</h2>
            <p className="mt-1 text-xs text-foreground-muted">Total component quantities needed across the full plan.</p>
            <div className="mt-3 grid gap-x-4 lg:grid-cols-2">{totals.intermediates.map(([key, amount]) => items[key] && <MaterialRow key={key} item={items[key]} quantity={amount} tooltipId={`craft-intermediate:${key}`} />)}</div>
          </section>
        )}

        <details className="group rounded-lg border border-border bg-surface p-4 sm:p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-heading text-base font-semibold text-accent">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />Full crafting breakdown
          </summary>
          <p className="mt-2 text-xs text-foreground-muted">Each component is rounded up to whole recipe batches; surplus output is shown at each step.</p>
          <ul className="mt-3 space-y-1">
            {plan?.children.map((node, index) => (
              <PlanTree
                key={`${node.key}:${index}`}
                node={node}
                items={items}
                professionNames={professionNames}
                currentProfessionId={professionId}
                id={`craft-tree-${index}`}
              />
            ))}
          </ul>
        </details>
      </div>
      </div>
    </>
  );
}

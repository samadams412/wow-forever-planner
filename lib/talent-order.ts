import type { ClassTalentData, Talent, TalentTree } from "@/lib/wow-data";
import type { RankState } from "@/lib/build-code";
// Relative .ts imports (not "@/") so node --test can load this file directly.
import { encodeBuild } from "./build-code.ts";
import { canAddPoint, MAX_TALENT_POINTS, MIN_TALENT_LEVEL } from "./talent-rules.ts";

// The order talent points were spent in: one talent id per point, first point
// first. null means the order is unknown (a link or saved build from before
// order tracking, or a build edited before tracking could start), and the
// planner shows no Talent order panel for it.
//
// Point i (0-based) is the point gained at level MIN_TALENT_LEVEL + i, so the
// level is derived from position and never stored.
export type TalentOrder = string[] | null;

export function levelForPoint(index: number): number {
  return MIN_TALENT_LEVEL + index;
}

// 64 URL-safe chars, one per point. Every class has fewer than 64 talents.
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";

// Same tier-then-col order build-code.ts uses, so an index means the same
// talent exactly when the build-code version matches.
function flatTalents(classData: ClassTalentData): Talent[] {
  return classData.trees.flatMap((tree) => [...tree.talents].sort((a, b) => a.tier - b.tier || a.col - b.col));
}

function buildCodeVersion(classData: ClassTalentData): string {
  return encodeBuild(classData, {}).split("-")[0];
}

function talentLookup(trees: TalentTree[]): Map<string, { tree: TalentTree; talent: Talent }> {
  const map = new Map<string, { tree: TalentTree; talent: Talent }>();
  for (const tree of trees) for (const talent of tree.talents) map.set(talent.id, { tree, talent });
  return map;
}

// The `order` query param: "<build-code version>.<one char per point>".
export function encodeOrder(classData: ClassTalentData, order: string[]): string {
  const index = new Map(flatTalents(classData).map((t, i) => [t.id, i]));
  return `${buildCodeVersion(classData)}.${order.map((id) => ALPHABET[index.get(id)!]).join("")}`;
}

// Returns null unless the param is current-version, every point maps to a
// talent, replaying it in order is legal at every step, and it ends at
// exactly `ranks`. Anything else is treated as "no order data".
export function decodeOrder(classData: ClassTalentData, param: string | null | undefined, ranks: RankState): TalentOrder {
  if (!param) return null;
  const [version, body = ""] = param.split(".");
  if (version !== buildCodeVersion(classData)) return null;
  const flat = flatTalents(classData);
  const order: string[] = [];
  for (const ch of body) {
    const talent = flat[ALPHABET.indexOf(ch)];
    if (!talent) return null;
    order.push(talent.id);
  }
  const replayed = replay(classData.trees, order);
  // replay() reorders an illegal sequence; an incoming order must be legal as given.
  if (!replayed || replayed.some((id, i) => id !== order[i])) return null;
  const counts: RankState = {};
  for (const id of order) counts[id] = (counts[id] ?? 0) + 1;
  const keys = new Set([...Object.keys(counts), ...Object.keys(ranks)]);
  for (const id of keys) if ((counts[id] ?? 0) !== (ranks[id] ?? 0)) return null;
  return order;
}

// Greedily replays `order`, each step taking the earliest pending point that
// is legal right now. A legal order comes back unchanged; after a refund
// leaves a later point unreachable where it sits (e.g. a tier-2 point that
// relied on the refunded tier-1 point), that point moves to the first place
// it becomes legal. Returns null if some point can never be placed.
function replay(trees: TalentTree[], order: string[]): string[] | null {
  const lookup = talentLookup(trees);
  const pending = [...order];
  const result: string[] = [];
  const ranks: RankState = {};
  while (pending.length > 0) {
    const i = pending.findIndex((id) => {
      const entry = lookup.get(id);
      return entry && canAddPoint(entry.tree, entry.talent, ranks, result.length, MAX_TALENT_POINTS);
    });
    if (i === -1) return null;
    const [id] = pending.splice(i, 1);
    ranks[id] = (ranks[id] ?? 0) + 1;
    result.push(id);
  }
  return result;
}

// Refunding a point takes back that talent's most recent point (the one that
// raised it to its current rank), then re-legalizes what follows.
export function removeFromOrder(trees: TalentTree[], order: string[], talentId: string): string[] {
  const i = order.lastIndexOf(talentId);
  if (i === -1) return order;
  const next = [...order.slice(0, i), ...order.slice(i + 1)];
  return replay(trees, next) ?? next;
}

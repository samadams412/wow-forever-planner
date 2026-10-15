import type { Talent, TalentTree } from "@/lib/wow-data";
import type { RankState } from "@/lib/build-code";
import { canAddPoint, canRemovePoint, totalPointsSpent } from "@/lib/talent-rules";
import { removeFromOrder, type TalentOrder } from "@/lib/talent-order";

// Point-allocation history for the planner. Only changes to ranks are
// recorded (add, remove, reset, reset-tree); UI state and class/build loads
// are not. Loading a build or switching class goes through "load", which
// clears history, since undoing across a different build would be confusing.
// Each history entry also carries the point order (lib/talent-order.ts), so
// undo/redo restore it together with the ranks.
const MAX_HISTORY = 200;

type Snapshot = { ranks: RankState; order: TalentOrder };

export type BuildState = Snapshot & {
  past: Snapshot[];
  future: Snapshot[];
};

export type BuildAction =
  | { type: "add"; trees: TalentTree[]; tree: TalentTree; talent: Talent; maxPoints: number }
  | { type: "remove"; trees: TalentTree[]; tree: TalentTree; talent: Talent }
  | { type: "resetTree"; tree: TalentTree }
  | { type: "reset" }
  | { type: "load"; ranks: RankState; order: TalentOrder }
  | { type: "undo" }
  | { type: "redo" };

function commit(state: BuildState, ranks: RankState, order: TalentOrder): BuildState {
  if (ranks === state.ranks) return state;
  // An empty build has a fully known order (no points), so tracking starts
  // fresh even after a legacy build with unknown order is cleared.
  if (Object.keys(ranks).length === 0) order = [];
  return {
    ranks,
    order,
    past: [...state.past, { ranks: state.ranks, order: state.order }].slice(-MAX_HISTORY),
    future: [],
  };
}

export function buildReducer(state: BuildState, action: BuildAction): BuildState {
  switch (action.type) {
    case "add": {
      // Same validation the mouse path has always used: canAddPoint decides,
      // and an invalid add returns the same state object so nothing is pushed.
      const { trees, tree, talent, maxPoints } = action;
      if (!canAddPoint(tree, talent, state.ranks, totalPointsSpent(trees, state.ranks), maxPoints)) return state;
      const order = state.order && [...state.order, talent.id];
      return commit(state, { ...state.ranks, [talent.id]: (state.ranks[talent.id] ?? 0) + 1 }, order);
    }
    case "remove": {
      const { trees, tree, talent } = action;
      if (!canRemovePoint(tree, talent, state.ranks)) return state;
      const next = { ...state.ranks, [talent.id]: (state.ranks[talent.id] ?? 0) - 1 };
      if (next[talent.id] <= 0) delete next[talent.id];
      return commit(state, next, state.order && removeFromOrder(trees, state.order, talent.id));
    }
    case "resetTree": {
      const ids = new Set(action.tree.talents.map((t) => t.id));
      if (![...ids].some((id) => state.ranks[id] !== undefined)) return state;
      const next = { ...state.ranks };
      for (const id of ids) delete next[id];
      // Trees don't gate each other, so dropping one tree's points leaves the
      // rest of the order legal as it stands.
      return commit(state, next, state.order && state.order.filter((id) => !ids.has(id)));
    }
    case "reset": {
      if (Object.keys(state.ranks).length === 0) return state;
      return commit(state, {}, []);
    }
    case "load":
      return { ranks: action.ranks, order: action.order, past: [], future: [] };
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...previous,
        past: state.past.slice(0, -1),
        future: [{ ranks: state.ranks, order: state.order }, ...state.future],
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        ...next,
        past: [...state.past, { ranks: state.ranks, order: state.order }],
        future: rest,
      };
    }
  }
}

// Ignore events aimed at text fields, so Ctrl+Z in a build-name box still
// does the browser's native text undo.
export function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.closest("input, textarea, select") !== null;
}

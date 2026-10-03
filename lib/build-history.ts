import type { Talent, TalentTree } from "@/lib/wow-data";
import type { RankState } from "@/lib/build-code";
import { canAddPoint, canRemovePoint, totalPointsSpent } from "@/lib/talent-rules";

// Point-allocation history for the planner. Only changes to ranks are
// recorded (add, remove, reset, reset-tree); UI state and class/build loads
// are not. Loading a build or switching class goes through "load", which
// clears history, since undoing across a different build would be confusing.
const MAX_HISTORY = 200;

export type BuildState = {
  ranks: RankState;
  past: RankState[];
  future: RankState[];
};

export type BuildAction =
  | { type: "add"; trees: TalentTree[]; tree: TalentTree; talent: Talent; maxPoints: number }
  | { type: "remove"; tree: TalentTree; talent: Talent }
  | { type: "resetTree"; tree: TalentTree }
  | { type: "reset" }
  | { type: "load"; ranks: RankState }
  | { type: "undo" }
  | { type: "redo" };

function commit(state: BuildState, ranks: RankState): BuildState {
  if (ranks === state.ranks) return state;
  return {
    ranks,
    past: [...state.past, state.ranks].slice(-MAX_HISTORY),
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
      return commit(state, { ...state.ranks, [talent.id]: (state.ranks[talent.id] ?? 0) + 1 });
    }
    case "remove": {
      const { tree, talent } = action;
      if (!canRemovePoint(tree, talent, state.ranks)) return state;
      const next = { ...state.ranks, [talent.id]: (state.ranks[talent.id] ?? 0) - 1 };
      if (next[talent.id] <= 0) delete next[talent.id];
      return commit(state, next);
    }
    case "resetTree": {
      const ids = new Set(action.tree.talents.map((t) => t.id));
      if (![...ids].some((id) => state.ranks[id] !== undefined)) return state;
      const next = { ...state.ranks };
      for (const id of ids) delete next[id];
      return commit(state, next);
    }
    case "reset": {
      if (Object.keys(state.ranks).length === 0) return state;
      return commit(state, {});
    }
    case "load":
      return { ranks: action.ranks, past: [], future: [] };
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ranks: previous,
        past: state.past.slice(0, -1),
        future: [state.ranks, ...state.future],
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        ranks: next,
        past: [...state.past, state.ranks],
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

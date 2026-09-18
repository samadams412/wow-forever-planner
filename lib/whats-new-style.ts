import type { TalentChangeKind } from "@/lib/whats-new";

// Reuses the site's existing new/changed/moved status colors (lib/talent-status.ts)
// for the semantically matching categories here -- added maps to "new" (violet,
// already reserved site-wide for that exact concept), moved reuses "moved" (sky),
// and a prereq/rule change reuses "changed" (amber), since a rule change is a kind
// of talent change. "removed" has no existing site equivalent, so it gets its own
// color (rose) rather than overloading one of the three above.
export const CHANGE_KIND_LABEL: Record<TalentChangeKind, string> = {
  added: "Added",
  removed: "Removed",
  moved: "Moved",
  ruleChanged: "Rule changed",
};

export const CHANGE_KIND_BAR_CLASS: Record<TalentChangeKind, string> = {
  added: "bg-violet",
  removed: "bg-rose-400",
  moved: "bg-sky-400",
  ruleChanged: "bg-amber-300",
};

export const CHANGE_KIND_DOT_CLASS: Record<TalentChangeKind, string> = {
  added: "bg-violet",
  removed: "bg-rose-400",
  moved: "bg-sky-400",
  ruleChanged: "bg-amber-300",
};

export const CHANGE_KIND_TEXT_CLASS: Record<TalentChangeKind, string> = {
  added: "text-violet",
  removed: "text-rose-400",
  moved: "text-sky-400",
  ruleChanged: "text-amber-300",
};

export const CHANGE_KIND_ORDER: TalentChangeKind[] = ["added", "removed", "moved", "ruleChanged"];

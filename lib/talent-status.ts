import type { TalentStatus } from "./wow-data";

export const STATUS_LABEL: Record<TalentStatus, string> = {
  new: "New",
  changed: "Changed",
  moved: "Moved",
  unchanged: "Unchanged",
};

export const STATUS_TEXT_CLASS: Record<TalentStatus, string> = {
  new: "text-violet",
  changed: "text-amber-300",
  moved: "text-sky-400",
  unchanged: "text-foreground-muted",
};

export const STATUS_DOT_CLASS: Record<TalentStatus, string> = {
  new: "bg-violet",
  changed: "bg-amber-300",
  moved: "bg-sky-400",
  unchanged: "bg-foreground-muted/50",
};

import type { Requirement } from "@/lib/gear-planner";

const KIND_LABEL: Record<string, string> = { profession: "Profession", reputation: "Reputation", pvpRank: "PvP rank", override: "Note" };

// "Requires Engineering (140)" -> "Engineering (140)", tagged by kind, so a gated pick is never a surprise.
export default function RequirementChips({ requires }: { requires?: Requirement[] }) {
  if (!requires?.length) return null;
  return (
    <span className="mt-0.5 flex flex-wrap gap-1">
      {requires.map((r) => (
        <span
          key={r.text}
          title={r.text}
          className="rounded bg-amber-400/15 px-1 py-px text-[10px] font-medium leading-tight text-amber-300 [html.light-mode_&]:text-amber-700"
        >
          {r.kind === "pvpRank" ? "" : `${KIND_LABEL[r.kind] ?? r.kind}: `}
          {r.text.replace(/^Requires /, "")}
        </span>
      ))}
    </span>
  );
}

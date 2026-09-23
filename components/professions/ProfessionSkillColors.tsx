import type { SkillColors } from "@/lib/profession-recipes";

// The classic WoW tradeskill skill-up convention: orange (100% chance) ->
// yellow -> green -> grey (0% chance, recipe no longer teaches you
// anything), read directly off this site's own recipe data rather than
// computed. Same four colors wowtbc.gg's own "Level Up" column and
// foreverchanges' recipe rows both use for this -- not this site's
// invention, just the standard trade-window color language every WoW
// crafting reference uses.
const COLOR_CLASS: Record<keyof SkillColors, string> = {
  orange: "text-orange-400",
  yellow: "text-yellow-300",
  green: "text-green-400",
  grey: "text-foreground-muted",
};

export default function ProfessionSkillColors({ skills }: { skills: SkillColors | null }) {
  if (!skills) return <span className="text-foreground-muted">--</span>;
  return (
    <span className="inline-flex gap-1.5 text-xs font-medium">
      {(["orange", "yellow", "green", "grey"] as const).map((key) => (
        <span key={key} className={COLOR_CLASS[key]}>
          {skills[key]}
        </span>
      ))}
    </span>
  );
}

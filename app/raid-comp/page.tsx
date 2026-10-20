import type { Metadata } from "next";
import RaidCompFromUrl from "@/components/raid-comp/RaidCompFromUrl";
import { SPECS, type SpecView } from "@/lib/raid-comp";
import { getRaidEffectSets, getRaidEffects } from "@/lib/raid-buffs";
import { CLASS_COLOR, classLabel, getTreeIcon, mediumIconUrl } from "@/lib/wow-data";

export const metadata: Metadata = {
  title: "Raid Comp Planner",
  description:
    "Plan a 40-player World of Warcraft: Forever raid by spec and see which raid buffs and debuffs your roster covers.",
};

export default function RaidCompPage() {
  const specs: SpecView[] = SPECS.map((s) => ({
    ...s,
    className: classLabel(s.classId),
    label: `${s.tree} ${classLabel(s.classId)}`,
    color: CLASS_COLOR[s.classId],
    icon: mediumIconUrl(getTreeIcon(s.classId, s.tree)),
  }));

  const sets = getRaidEffectSets();

  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Raid Comp Planner</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Tap a spec, then tap slots to place it. On desktop you can also drag specs and players around.
      </p>
      <RaidCompFromUrl
        specs={specs}
        effects={getRaidEffects()}
        onlyOneCounts={sets.onlyOneCounts}
        perCaster={sets.perCaster}
        build={sets.build}
      />
    </main>
  );
}

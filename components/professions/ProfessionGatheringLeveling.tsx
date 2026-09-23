import LootItemPill from "@/components/reference/LootItemPill";
import { mediumIconUrl } from "@/lib/wow-data";
import type { GatheringStep } from "@/lib/gathering-professions";

// Matches foreverchanges.pro's gathering "Leveling 1 to 300" chapter
// (Mining, Herbalism) and Skinning's single "What to skin at your skill"
// chapter, which doubles as both node list and leveling guide there (no
// separate nodes chapter exists for Skinning -- see parse-gathering-page.js's
// header comment). No rank tiers here at all, unlike the crafting Leveling
// guide's Apprentice/Journeyman/... groups -- gathering's own page has none,
// just a flat list of skill-range steps.
export default function ProfessionGatheringLeveling({ steps, professionId }: { steps: GatheringStep[]; professionId: string }) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      {steps.map((step, i) => (
        <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface p-3 text-sm">
          <span className="w-20 shrink-0 text-xs font-medium text-accent">
            {step.range[1] != null ? (
              <>
                {step.range[0]}&ndash;{step.range[1]}
              </>
            ) : (
              step.range[0]
            )}
          </span>
          <span className="font-medium text-foreground">{step.name}</span>
          <span className="text-xs text-foreground-muted">{step.zones}</span>
          <div className="ml-auto flex flex-wrap gap-1">
            {step.items.length > 0
              ? step.items.map((item, j) => (
                  <LootItemPill key={j} item={item} tooltipId={`prof:${professionId}:lvl:${i}:${j}`} context="catalog" />
                ))
              : step.icons.map((icon, j) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={j} src={mediumIconUrl(icon.icon)} alt={icon.name} title={icon.name} className="h-6 w-6 rounded-sm" />
                ))}
          </div>
        </div>
      ))}
    </div>
  );
}

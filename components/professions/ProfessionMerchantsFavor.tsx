import LootItemPill from "@/components/reference/LootItemPill";
import ProfessionSkillColors from "@/components/professions/ProfessionSkillColors";
import type { FavorTier } from "@/lib/profession-recipes";

// Matches foreverchanges.pro/professions/<id>#favor's own layout -- a tier
// header naming the favor amount and skill range, then a flat grid of that
// tier's recipes. The source data only ever gives one raw skill_threshold
// number per item; the build script (scripts/build-professions.js) already
// cross-referenced that against the main recipe list by name to pull the
// item's real orange/yellow/green/grey set (confirmed the threshold always
// equals that recipe's own `skills.orange`), so this renders the same
// 4-color skill-up display the main recipe table uses rather than a bare
// number, falling back to just the threshold when no match was found.
export default function ProfessionMerchantsFavor({ favor, professionId }: { favor: FavorTier[]; professionId: string }) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      {favor.map((tier, ti) => (
        <div key={tier.tier} className="rounded-lg border border-border bg-surface p-3">
          <div className="mb-2 text-sm font-semibold text-accent">{tier.tier}</div>
          {tier.items.length === 0 ? (
            <p className="text-xs text-foreground-muted">
              No recipes recorded for this tier yet -- check back as the beta continues.
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {tier.items.map((favItem, ii) => (
                <div key={ii} className="flex items-center gap-1.5">
                  <LootItemPill item={favItem.item} tooltipId={`prof:${professionId}:favor:${ti}:${ii}`} context="catalog" />
                  {favItem.skills ? (
                    <ProfessionSkillColors skills={favItem.skills} />
                  ) : (
                    <span className="text-xs font-medium text-orange-400">{favItem.skillThreshold}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

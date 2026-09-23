import Link from "next/link";
import LootItemPill from "@/components/reference/LootItemPill";
import { mediumIconUrl } from "@/lib/wow-data";
import type { CampSection, CampMilestone } from "@/lib/profession-recipes";

// Matches foreverchanges.pro/professions/<id>#camp's own three-part layout
// (Legacy points and title / At camp / Legacy perks), rebuilt in this
// site's own theme. A milestone/camp-object row's icon comes from one of
// two places: a real item's own icon via LootItemPill when the row links
// one (every camp object, and the Certification), or the row's own plain
// trade/profession icon when it doesn't (Journeyman/Expert/Artisan) --
// those aren't items at all, so routing them through LootItemPill's
// unresolved-item treatment would misleadingly imply a real item we just
// couldn't identify, rather than "there's no item here."
function MilestoneRow({ milestone, tooltipId }: { milestone: CampMilestone; tooltipId: string }) {
  return (
    <li className="flex items-start gap-3 py-2">
      {milestone.item ? (
        <LootItemPill item={milestone.item} tooltipId={tooltipId} context="catalog" />
      ) : (
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
          {milestone.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediumIconUrl(milestone.icon)} alt="" className="h-5 w-5 shrink-0 rounded-sm" />
          )}
          {milestone.name}
        </span>
      )}
      <span className="min-w-0 flex-1 text-xs text-foreground-muted">{milestone.description}</span>
      <span className="shrink-0 text-right text-xs">
        {milestone.legacyPoints && <span className="font-medium text-accent">{milestone.legacyPoints}</span>}
        {milestone.skill !== null && <span className="text-foreground-muted">Skill {milestone.skill}</span>}
        {milestone.blueprint && (
          <span className="ml-1.5 inline-block align-middle">
            <LootItemPill item={milestone.blueprint} tooltipId={`${tooltipId}:blueprint`} context="catalog" />
          </span>
        )}
      </span>
    </li>
  );
}

export default function ProfessionCamp({ camp, professionId }: { camp: CampSection; professionId: string }) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      {camp.milestones.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-3">
          <h2 className="mb-1 text-sm font-semibold text-accent">Legacy points and title</h2>
          <ul className="divide-y divide-border/60">
            {camp.milestones.map((m, i) => (
              <MilestoneRow key={i} milestone={m} tooltipId={`prof:${professionId}:camp:milestone:${i}`} />
            ))}
          </ul>
        </div>
      )}

      {camp.campObjects.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-3">
          <h2 className="mb-1 text-sm font-semibold text-accent">At camp</h2>
          <ul className="divide-y divide-border/60">
            {camp.campObjects.map((m, i) => (
              <MilestoneRow key={i} milestone={m} tooltipId={`prof:${professionId}:camp:object:${i}`} />
            ))}
          </ul>
        </div>
      )}

      {camp.legacyPerks.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-3">
          <h2 className="mb-1 text-sm font-semibold text-accent">Legacy perks</h2>
          {/* These 3 perks aren't specific to this profession -- foreverchanges.pro
              shows the identical list on every profession's own page, since they're
              just the "Professions" Legacy tree, not a per-profession reward. */}
          <p className="mb-2 text-xs text-foreground-muted">
            From the Legacy Perks Professions tree, shared across every profession.
          </p>
          <ul className="divide-y divide-border/60">
            {camp.legacyPerks.map((perk) => (
              <li key={perk.id} className="flex items-start gap-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediumIconUrl(perk.icon)} alt="" className="h-5 w-5 shrink-0 rounded-sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground">{perk.name}</div>
                  <p className="text-xs text-foreground-muted">{perk.description}</p>
                  <p className="mt-0.5 text-[10px] text-foreground-muted/70">
                    {perk.maxRank} rank{perk.maxRank === 1 ? "" : "s"}
                    {perk.gate > 0 && `, needs ${perk.gate} points spent in the tree`}
                    {perk.prereqName && `, needs a rank in ${perk.prereqName}`}
                  </p>
                </div>
                <Link href="/reference/legacy-perks" className="shrink-0 self-center text-xs text-accent hover:underline">
                  Plan it &rsaquo;
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

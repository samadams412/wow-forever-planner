import { legacyPerks, type LegacyPerkTree } from "@/lib/legacy-perks";
import { mediumIconUrl } from "@/lib/wow-data";
import ConfidenceBadge from "@/components/planner/ConfidenceBadge";

function TreeColumn({ tree }: { tree: LegacyPerkTree }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 border-b border-border pb-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediumIconUrl(tree.icon)} alt="" className="h-6 w-6 rounded-sm" />
        <h3 className="font-heading text-sm font-semibold tracking-wide text-foreground">{tree.name}</h3>
      </div>
      {tree.perks.map((perk) => (
        <div key={perk.name} className="rounded border border-border bg-surface p-2.5">
          <div className="flex items-start gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediumIconUrl(perk.icon)} alt="" className="h-7 w-7 shrink-0 rounded-sm" />
            <div>
              <span className="text-sm font-medium text-accent">{perk.name}</span>{" "}
              <span className="text-xs text-foreground-muted">
                ({perk.ranks} rank{perk.ranks > 1 ? "s" : ""})
              </span>
            </div>
          </div>
          {(perk.castTime || perk.cooldown) && (
            <p className="mt-1 text-xs text-foreground-muted/70">
              {[perk.castTime, perk.cooldown].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-foreground/90">
            {perk.description}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function LegacyPerksReference() {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Legacy Perks</h1>
        <ConfidenceBadge confidence={legacyPerks.confidence} />
      </div>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        Account-wide, non-combat bonuses spent across three trees. You earn Legacy Points by
        completing Legacy Challenges -- things like leveling a specific class or hitting a
        tradeskill milestone -- meant to reward play you&apos;re already doing rather than add busywork.
        Points are earned account-wide and shared across your characters, but each character spends
        its own points independently in its own set of Legacy Trees. Source: {legacyPerks.source}.
      </p>
      <div className="mt-3 rounded-lg border border-accent/40 bg-surface p-3">
        <p className="max-w-[70ch] text-sm leading-relaxed text-foreground/90">
          <span className="font-semibold text-accent">Not yet an interactive planner: </span>
          {legacyPerks.pointCapNote}
        </p>
      </div>
      <div className="mt-2 rounded-lg border border-border bg-surface p-3">
        <p className="max-w-[70ch] text-sm leading-relaxed text-foreground/90">
          <span className="font-semibold text-foreground">Also changing: </span>
          {legacyPerks.mountCostNote}
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {legacyPerks.trees.map((tree) => (
          <TreeColumn key={tree.name} tree={tree} />
        ))}
      </div>

      <section className="mt-8">
        <h2 className="font-heading text-lg font-semibold tracking-wide text-foreground">
          Legacy Rewards
        </h2>
        <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
          A separate, cosmetic-only track unlocked by total Legacy Points ever earned -- independent
          of how many of those points are later spent on perks above. {legacyPerks.rewards.rewardTrackNote}
        </p>
        <div className="mt-2 rounded-lg border border-accent/40 bg-surface p-3">
          <p className="max-w-[70ch] text-sm leading-relaxed text-foreground/90">
            <span className="font-semibold text-accent">Reward thresholds not yet known: </span>
            {legacyPerks.rewards.note}
          </p>
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {legacyPerks.rewards.items.map((reward) => (
            <div key={reward.name} className="flex gap-2.5 rounded border border-border bg-surface p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediumIconUrl(reward.icon)}
                alt=""
                title={reward.iconPlaceholder ? "Placeholder icon, not yet confirmed" : undefined}
                className="h-8 w-8 shrink-0 rounded-sm"
              />
              <div>
                <span className="text-sm font-medium text-foreground">{reward.name}</span>{" "}
                <span className="text-xs uppercase tracking-wide text-foreground-muted">
                  {reward.type}
                </span>
                <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-foreground/90">
                  {reward.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 max-w-[70ch] text-xs text-foreground-muted/70">
          <span className="font-semibold">Looking ahead: </span>
          {legacyPerks.expansionNote}
        </p>
      </section>
    </div>
  );
}

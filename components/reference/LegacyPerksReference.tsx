import { Info, ArrowLeftRight } from "lucide-react";
import { legacyPerks, type LegacyPerkTree } from "@/lib/legacy-perks";
import { mediumIconUrl } from "@/lib/wow-data";
import GoldRule from "@/components/site/GoldRule";

function RankPips({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-accent/70" />
      ))}
    </span>
  );
}

function TreeColumn({ tree }: { tree: LegacyPerkTree }) {
  return (
    <div id={tree.name.toLowerCase()} className="scroll-mt-24 space-y-2.5">
      <div className="flex items-center gap-2 border-b border-border pb-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediumIconUrl(tree.icon)} alt="" className="h-6 w-6 rounded-sm" />
        <h3 className="text-sm font-semibold text-foreground">{tree.name}</h3>
      </div>
      {tree.perks.map((perk, i) => (
        <div
          key={perk.name + i}
          className={`rounded border p-2.5 ${
            perk.placeholder ? "border-dashed border-border/50 bg-surface/40" : "border-border bg-surface"
          }`}
        >
          <div className="flex items-start gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediumIconUrl(perk.icon)}
              alt=""
              className={`h-7 w-7 shrink-0 rounded-sm ${perk.placeholder ? "opacity-40 grayscale" : ""}`}
            />
            <div>
              <span
                className={`text-sm font-medium ${perk.placeholder ? "text-foreground-muted" : "text-accent"}`}
              >
                {perk.name}
              </span>
              {!perk.placeholder && (
                <>
                  {" "}
                  <span className="text-xs text-foreground-muted">
                    ({perk.ranks} rank{perk.ranks > 1 ? "s" : ""})
                  </span>{" "}
                  <RankPips count={perk.ranks} />
                </>
              )}
            </div>
          </div>
          {(perk.castTime || perk.cooldown) && (
            <p className="mt-1 text-xs text-foreground-muted/70">
              {[perk.castTime, perk.cooldown].filter(Boolean).join(", ")}
            </p>
          )}
          <p
            className={`mt-1.5 max-w-[60ch] text-sm leading-relaxed ${
              perk.placeholder ? "italic text-foreground-muted/70" : "text-foreground/90"
            }`}
          >
            {perk.description}
          </p>
        </div>
      ))}
    </div>
  );
}

function JumpNav() {
  return (
    <nav className="sticky top-0 z-10 -mx-3 mb-4 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:px-2">
      {legacyPerks.trees.map((tree) => (
        <a
          key={tree.name}
          href={`#${tree.name.toLowerCase()}`}
          className="shrink-0 rounded px-2.5 py-1 text-xs font-medium text-foreground-muted hover:bg-surface hover:text-foreground"
        >
          {tree.name}
        </a>
      ))}
    </nav>
  );
}

export default function LegacyPerksReference() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Legacy Perks</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        Account-wide, non-combat bonuses spent across three trees. You earn Legacy Points by
        completing Legacy Challenges -- things like leveling a specific class or hitting a
        tradeskill milestone -- meant to reward play you&apos;re already doing rather than add busywork.
        Points are earned account-wide and shared across your characters, but each character spends
        its own points independently in its own set of Legacy Trees.
      </p>
      <p className="mt-1 max-w-[70ch] text-[11px] text-foreground-muted/60">Source: {legacyPerks.source}</p>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p className="max-w-[70ch] text-sm leading-relaxed text-foreground/90">
          <span className="font-semibold text-accent">Not yet an interactive planner: </span>
          {legacyPerks.pointCapNote}
        </p>
      </div>
      <div className="mt-2 flex items-start gap-2 rounded-lg border border-sky-400/30 bg-sky-400/5 p-3">
        <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
        <p className="max-w-[70ch] text-sm leading-relaxed text-foreground/90">
          <span className="font-semibold text-sky-400">Also changing: </span>
          {legacyPerks.mountCostNote}
        </p>
      </div>

      <div className="mt-6">
        <JumpNav />
        <div className="grid gap-4 sm:grid-cols-3">
          {legacyPerks.trees.map((tree) => (
            <TreeColumn key={tree.name} tree={tree} />
          ))}
        </div>
      </div>

      <GoldRule className="mt-8" />

      <section className="mt-4">
        <h2 className="font-heading text-lg font-semibold tracking-wide text-foreground">
          Legacy Rewards
        </h2>
        <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
          A separate, cosmetic-only track unlocked by total Legacy Points ever earned -- independent
          of how many of those points are later spent on perks above. {legacyPerks.rewards.rewardTrackNote}
        </p>
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
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

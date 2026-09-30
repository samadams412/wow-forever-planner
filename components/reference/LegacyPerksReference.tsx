"use client";

import { useCallback, useEffect, useState } from "react";
import { Info } from "lucide-react";
import { legacyPerks } from "@/lib/legacy-perks";
import { canAddLegacyPoint, canRemoveLegacyPoint, pointsSpentInLegacyTree } from "@/lib/legacy-perks";
import type { RankState } from "@/lib/build-code";
import { mediumIconUrl } from "@/lib/wow-data";
import GoldRule from "@/components/site/GoldRule";
import LegacyPerkTreeGrid from "./LegacyPerkTreeGrid";

const STORAGE_KEY = "forevercraft:legacy-perks-build";

function readSavedRanks(): RankState {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    const requested: RankState = {};
    for (const tree of legacyPerks.trees) {
      for (const perk of tree.perks) {
        const value = (saved as Record<string, unknown>)[perk.id];
        if (!perk.placeholder && typeof value === "number" && Number.isInteger(value) && value > 0) {
          requested[perk.id] = Math.min(value, perk.maxRank);
        }
      }
    }
    const ranks: RankState = {};
    let changed = true;
    while (changed) {
      changed = false;
      const total = legacyPerks.trees.reduce((sum, tree) => sum + pointsSpentInLegacyTree(tree, ranks), 0);
      for (const tree of legacyPerks.trees) {
        for (const perk of tree.perks) {
          if ((ranks[perk.id] ?? 0) >= (requested[perk.id] ?? 0)) continue;
          const spent = legacyPerks.trees.reduce((sum, current) => sum + pointsSpentInLegacyTree(current, ranks), 0);
          if (canAddLegacyPoint(tree, perk, ranks, spent, legacyPerks.spendCap)) {
            ranks[perk.id] = (ranks[perk.id] ?? 0) + 1;
            changed = true;
          }
        }
      }
      if (total >= legacyPerks.spendCap) break;
    }
    return ranks;
  } catch {
    return {};
  }
}

export default function LegacyPerksReference() {
  // Perk ids include their tree name, so one RankState can track all trees.
  const [ranks, setRanks] = useState<RankState>({});
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRanks(readSavedRanks());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ranks));
    } catch {
      // The calculator remains usable when browser storage is unavailable.
    }
  }, [ranks, storageReady]);

  const totalSpent = legacyPerks.trees.reduce((sum, tree) => sum + pointsSpentInLegacyTree(tree, ranks), 0);

  const addPoint = useCallback(
    (perkId: string) => {
      const tree = legacyPerks.trees.find((t) => t.perks.some((p) => p.id === perkId));
      const perk = tree?.perks.find((p) => p.id === perkId);
      if (!tree || !perk) return;
      setRanks((prev) => {
        const prevTotal = legacyPerks.trees.reduce((sum, t) => sum + pointsSpentInLegacyTree(t, prev), 0);
        if (!canAddLegacyPoint(tree, perk, prev, prevTotal, legacyPerks.spendCap)) return prev;
        return { ...prev, [perkId]: (prev[perkId] ?? 0) + 1 };
      });
    },
    []
  );

  const removePoint = useCallback((perkId: string) => {
    const tree = legacyPerks.trees.find((t) => t.perks.some((p) => p.id === perkId));
    const perk = tree?.perks.find((p) => p.id === perkId);
    if (!tree || !perk) return;
    setRanks((prev) => {
      if (!canRemoveLegacyPoint(tree, perk, prev)) return prev;
      const next = { ...prev, [perkId]: (prev[perkId] ?? 0) - 1 };
      if (next[perkId] <= 0) delete next[perkId];
      return next;
    });
  }, []);

  const resetTree = useCallback((treeName: string) => {
    const tree = legacyPerks.trees.find((t) => t.name === treeName);
    if (!tree) return;
    const ids = new Set(tree.perks.map((p) => p.id));
    setRanks((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => setRanks({}), []);

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Legacy Perks</h1>
      </div>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        Account-wide, non-combat bonuses spent across three trees. You earn Legacy Points by
        completing Legacy Challenges, such as leveling a specific class or reaching a
        tradeskill milestone. These rewards recognize the play you&apos;re already doing.
        Points are earned account-wide and shared across your characters, but each character spends
        its own points independently in its own set of Legacy Trees. Choose perks below to plan
        a spend order. Your selections are saved in this browser.
      </p>
      

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p className="max-w-[70ch] text-sm leading-relaxed text-foreground/90">
          <span className="font-semibold text-accent">Spend cap: </span>
          {legacyPerks.earnCapNote}
        </p>
      </div>
      

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {legacyPerks.trees.map((tree) => (
          <LegacyPerkTreeGrid
            key={tree.name}
            tree={tree}
            ranks={ranks}
            spent={pointsSpentInLegacyTree(tree, ranks)}
            totalSpent={totalSpent}
            spendCap={legacyPerks.spendCap}
            onResetAll={resetAll}
            onAdd={addPoint}
            onRemove={removePoint}
            onResetTree={() => resetTree(tree.name)}
          />
        ))}
      </div>

      <GoldRule className="mt-8" />

      <section className="mt-4">
        <h2 className="font-heading text-lg font-semibold tracking-wide text-foreground">
          Legacy Rewards
        </h2>
        <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
          A separate, cosmetic-only track unlocked by total Legacy Points ever earned, independent
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
      <p className="mt-1 max-w-[70ch] text-[11px] text-foreground-muted/60">Source: {legacyPerks.source}</p>
    </div>
  );
}

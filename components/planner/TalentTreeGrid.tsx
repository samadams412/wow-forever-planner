import type { RankState } from "@/lib/build-code";
import type { TalentTree } from "@/lib/wow-data";
import { treeBackgroundUrl, mediumIconUrl, getTreeIcon } from "@/lib/wow-data";
import { canAddPoint, pointsSpentInTree, POINTS_PER_ROW, MAX_TALENT_POINTS, tierUnlocked } from "@/lib/talent-rules";
import { formatTooltipText } from "@/lib/tooltip";
import CornerBracket from "@/components/site/CornerBracket";
import TalentNode from "./TalentNode";
import {
  TooltipCardInline,
  TooltipName,
  TooltipRank,
  TooltipDescription,
  TooltipRequirement,
  TooltipClassicNote,
} from "./TooltipCard";

const TIERS = 7;
const COLS = 4;

export default function TalentTreeGrid({
  classId,
  tree,
  ranks,
  totalSpent,
  onAdd,
  onRemove,
  compareMode,
  tappedTalentId,
  onTap,
  peekTalentId,
  onPeek,
  onResetTree,
}: {
  classId: string;
  tree: TalentTree;
  ranks: RankState;
  totalSpent: number;
  onAdd: (talentId: string) => void;
  onRemove: (talentId: string) => void;
  compareMode?: boolean;
  tappedTalentId: string | null;
  onTap: (talentId: string | null) => void;
  peekTalentId: string | null;
  onPeek: (talentId: string | null) => void;
  onResetTree: () => void;
}) {
  const byId = new Map(tree.talents.map((t) => [t.id, t]));
  const spent = pointsSpentInTree(tree, ranks);

  // The talent whose inline tooltip is currently shown below its row --
  // long-press-to-read (peek) takes priority over the last tapped-to-spend
  // talent, and reverts to it on release. undefined (not this tree) when
  // the active id belongs to a different tree's talent.
  const activeTalent = byId.get(peekTalentId ?? tappedTalentId ?? "");
  const activeTier = activeTalent?.tier ?? null;

  // Talents at or before the active tier keep their original grid line;
  // an inline tooltip row is spliced in right after it, so every tier past
  // that one shifts down one line to make room instead of anything
  // floating on top of the grid.
  function rowLine(tier: number) {
    return activeTier !== null && tier > activeTier ? tier + 1 : tier;
  }

  const rowTracks: string[] = [];
  for (let tier = 1; tier <= TIERS; tier++) {
    rowTracks.push("1fr");
    if (tier === activeTier) rowTracks.push("auto");
  }

  const activeRank = activeTalent ? (ranks[activeTalent.id] ?? 0) : 0;
  const activeCurrentRankText = activeTalent
    ? activeRank > 0
      ? activeTalent.ranks[activeRank - 1]
      : activeTalent.maxRank === 1
        ? activeTalent.ranks[0]
        : null
    : null;
  const activeNextRankText =
    activeTalent && activeTalent.maxRank > 1 && activeRank < activeTalent.maxRank
      ? activeTalent.ranks[activeRank]
      : null;
  const activeTierPointsRequired = activeTalent ? POINTS_PER_ROW * (activeTalent.tier - 1) : 0;
  const activeTierLocked = activeTalent ? !tierUnlocked(activeTalent.tier, spent) : false;
  const activeCapReached = activeTalent
    ? activeRank < activeTalent.maxRank && totalSpent >= MAX_TALENT_POINTS
    : false;
  const activePrereqName = activeTalent?.prereq ? byId.get(activeTalent.prereq.id)?.name : undefined;
  const pointsLeft = MAX_TALENT_POINTS - totalSpent;

  return (
    <div className="relative w-full max-w-77 rounded-sm border-2 border-accent/70 bg-surface p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]">
      <CornerBracket position="tl" />
      <CornerBracket position="tr" />
      <CornerBracket position="bl" />
      <CornerBracket position="br" />
      <div className="mb-1.5 flex items-center justify-between border-b border-accent/30 px-0.5 pb-1.5">
        <div className="flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediumIconUrl(getTreeIcon(classId, tree.name))}
            alt=""
            className="h-5 w-5 shrink-0 rounded-full border border-accent/60"
          />
          <h3 className="font-heading text-sm font-semibold tracking-wide text-foreground">{tree.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-foreground-muted">{spent} pts</span>
          <button
            type="button"
            onClick={onResetTree}
            disabled={spent === 0}
            title={`Reset ${tree.name} talents`}
            aria-label={`Reset ${tree.name} talents`}
            className="text-foreground-muted/70 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-foreground-muted/70"
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M12.8 4.8A5 5 0 1 0 13.5 8.5" strokeLinecap="round" />
              <path d="M12.8 1.8v3.4h-3.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div
        className="relative grid gap-2.5 rounded bg-cover bg-center p-2"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(52px, 1fr))`,
          gridTemplateRows: rowTracks.join(" "),
          backgroundImage: `linear-gradient(rgba(12,13,16,0.55), rgba(12,13,16,0.55)), url(${treeBackgroundUrl(classId, tree.name)})`,
        }}
      >
        {tree.talents
          .filter((t) => t.prereq)
          .map((t) => {
            const prereq = byId.get(t.prereq!.id);
            if (!prereq) return null;
            const met = (ranks[prereq.id] ?? 0) >= t.prereq!.ranks;
            return (
              <div
                key={`connector-${t.id}`}
                className="pointer-events-none flex items-stretch justify-center"
                style={{
                  gridColumn: t.col,
                  gridRow: `${rowLine(prereq.tier)} / ${rowLine(t.tier) + 1}`,
                }}
              >
                <div className={`w-1.5 rounded-full ${met ? "bg-accent" : "bg-foreground-muted/50"}`} />
              </div>
            );
          })}

        {tree.talents.map((t) => (
          <TalentNode
            key={t.id}
            talent={t}
            row={rowLine(t.tier)}
            rank={ranks[t.id] ?? 0}
            canAdd={canAddPoint(tree, t, ranks, totalSpent)}
            onAdd={() => onAdd(t.id)}
            onRemove={() => onRemove(t.id)}
            prereqName={t.prereq ? byId.get(t.prereq.id)?.name : undefined}
            compareMode={compareMode}
            treeName={tree.name}
            pointsInTree={spent}
            totalSpent={totalSpent}
            tappedTalentId={tappedTalentId}
            onTap={onTap}
            onPeek={onPeek}
          />
        ))}

        {tree.talents
          .filter((t) => t.prereq)
          .map((t) => {
            const prereq = byId.get(t.prereq!.id);
            if (!prereq) return null;
            const met = (ranks[prereq.id] ?? 0) >= t.prereq!.ranks;
            return (
              <div
                key={`arrow-${t.id}`}
                className="pointer-events-none relative"
                style={{ gridColumn: t.col, gridRow: rowLine(t.tier) }}
              >
                <div
                  className={`absolute -top-[5px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[7px] ${
                    met ? "border-t-accent" : "border-t-foreground-muted/50"
                  }`}
                />
              </div>
            );
          })}

        {activeTalent && (
          <TooltipCardInline style={{ gridColumn: "1 / -1", gridRow: activeTier! + 1 }}>
            <div className="flex items-baseline justify-between gap-2">
              <TooltipName>{activeTalent.name}</TooltipName>
              <TooltipRank>
                Rank {activeRank}/{activeTalent.maxRank} · {pointsLeft} left
              </TooltipRank>
            </div>
            {activeCurrentRankText && (
              <TooltipDescription>{formatTooltipText(activeCurrentRankText)}</TooltipDescription>
            )}
            {activeNextRankText && (
              <>
                <TooltipRank>Next Rank</TooltipRank>
                <TooltipDescription>{formatTooltipText(activeNextRankText)}</TooltipDescription>
              </>
            )}
            {activeTalent.prereq && (
              <TooltipRequirement>
                Requires {activeTalent.prereq.ranks} rank{activeTalent.prereq.ranks > 1 ? "s" : ""} in{" "}
                {activePrereqName ?? "prerequisite talent"}
              </TooltipRequirement>
            )}
            {activeTalent.reqText && <TooltipRequirement>{activeTalent.reqText}</TooltipRequirement>}
            {activeTierLocked && (
              <TooltipRequirement>
                Requires {activeTierPointsRequired} points in {tree.name} Talents
              </TooltipRequirement>
            )}
            {activeCapReached && (
              <TooltipRequirement>
                All {MAX_TALENT_POINTS} talent points are spent -- unlearn a point elsewhere before you can
                spend one here.
              </TooltipRequirement>
            )}
            {compareMode && activeTalent.classic && (
              <TooltipClassicNote
                status={activeTalent.status}
                position={
                  activeTalent.status === "moved" &&
                  activeTalent.classic.tree &&
                  activeTalent.classic.tier &&
                  activeTalent.classic.col
                    ? `${activeTalent.classic.tree} tier ${activeTalent.classic.tier}, col ${activeTalent.classic.col}`
                    : undefined
                }
              >
                {activeTalent.classic.renamedFrom && (
                  <>
                    Was called &quot;{activeTalent.classic.renamedFrom}&quot; in Classic.
                    <br />
                  </>
                )}
                {activeTalent.classic.text ? formatTooltipText(activeTalent.classic.text) : null}
              </TooltipClassicNote>
            )}
          </TooltipCardInline>
        )}
      </div>
    </div>
  );
}

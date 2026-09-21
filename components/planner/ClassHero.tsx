import { mediumIconUrl, getTreeIcon, CLASS_COLOR, classLabel, type TalentTree } from "@/lib/wow-data";
import { pointsSpentInTree, leadingTreeIndex } from "@/lib/talent-rules";
import type { RankState } from "@/lib/build-code";

// Every tree's bar is gold; the tree with the current point lead (if any)
// is white instead, so the lead reads at a glance without needing a
// distinct color per tree.
const BAR_COLOR = "var(--accent)";
const LEAD_BAR_COLOR = "#ffffff";

// CLASS_COLOR (lib/wow-data.ts) is the standard WoW class-color palette --
// several of those (Priest's #FFFFFF most severely, Rogue's pale yellow and
// Mage's light blue to a lesser degree) have no guaranteed contrast against
// whatever this card's own background happens to be: Light mode's near-
// white surface, Themed mode's dark one, or the color-tinted gradient
// background below that's itself derived from the same class color. Rather
// than special-case Priest, every class-colored text here gets the same
// dark outline -- a general fallback so a future class-color addition
// can't silently break in either mode either.
//
// A single soft blurred shadow (the [text-shadow:...] convention used for
// hero text elsewhere on the site) isn't enough here: that convention
// assumes a photo behind the text, which has natural tonal variation for a
// soft halo to show up against. Priest's white-on-Light-mode's near-white
// surface is the opposite case -- a solid color within a few shades of the
// text itself -- so this is a real 4-direction hard outline plus a wider
// soft glow, not just a drop shadow.
const CLASS_TEXT_SHADOW = [
  "-1px -1px 2px rgba(0,0,0,0.9)",
  "1px -1px 2px rgba(0,0,0,0.9)",
  "-1px 1px 2px rgba(0,0,0,0.9)",
  "1px 1px 2px rgba(0,0,0,0.9)",
  "0 0 5px rgba(0,0,0,0.6)",
].join(", ");

export default function ClassHero({
  classId,
  trees,
  ranks,
  maxPoints,
}: {
  classId: string;
  trees: TalentTree[];
  ranks: RankState;
  maxPoints: number;
}) {
  const color = CLASS_COLOR[classId] ?? "var(--accent)";
  const spentPerTree = trees.map((tree) => pointsSpentInTree(tree, ranks));
  const leadIdx = leadingTreeIndex(trees, ranks);
  const specLabel = leadIdx !== null ? `${trees[leadIdx].name} ${classLabel(classId)}` : null;

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: `${color}55`,
        borderBottomWidth: 3,
        borderBottomColor: color,
        background: `linear-gradient(90deg, ${color}22, transparent 80%)`,
      }}
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediumIconUrl(`class_${classId}`)} alt="" className="h-9 w-9 shrink-0 rounded" />
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold tracking-wide" style={{ color, textShadow: CLASS_TEXT_SHADOW }}>
            {classLabel(classId)}
          </h2>
          <p className="text-xs text-foreground-muted">
            {specLabel && (
              <span className="mr-1.5 font-semibold" style={{ color, textShadow: CLASS_TEXT_SHADOW }}>
                {specLabel}
              </span>
            )}
            {trees.map((tree, i) => (
              <span key={tree.name}>
                {i > 0 && " · "}
                {spentPerTree[i]} {tree.name}
              </span>
            ))}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1 sm:w-44 sm:shrink-0">
        {trees.map((tree, i) => {
          const pct = maxPoints > 0 ? Math.min(100, (spentPerTree[i] / maxPoints) * 100) : 0;
          const barColor = i === leadIdx ? color : "#ffd700";
          return (
            <div key={tree.name} className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediumIconUrl(getTreeIcon(classId, tree.name))}
                alt=""
                className="h-4 w-4 shrink-0 rounded-full"
              />
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-background/60">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
              <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-foreground-muted">
                {spentPerTree[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

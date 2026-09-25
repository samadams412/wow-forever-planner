import { diffWords } from "@/lib/text-diff";

// What's New's own before/after diff. Same visual pattern as the planner's
// Compare-to-Classic diff (TooltipClassicDiff: old words struck through in
// red, new words highlighted in gold, shared wording plain), but labeled
// "Previously" / "Now" -- a patch changes things relative to the previous
// beta build, and many changed talents/spells (e.g. anything new in
// Forever) have no Classic state at all, so "Classic" would be wrong here.
// Kept separate from TooltipClassicDiff on purpose: that one's Classic vs.
// Forever wording is correct on talent tooltips and shouldn't be
// parameterized to say anything else.
//
// Always-dark card, like the tooltips this pattern normally lives in: the
// red/gold colors are tuned for a dark background, not the page theme.
export default function PatchChangeDiff({
  changes,
}: {
  changes: { label?: string; before: string; after: string }[];
}) {
  return (
    <div className="mt-2 space-y-2 rounded border border-[#c8aa6e]/40 bg-[#0a0f1a]/95 p-2.5">
      {changes.map((c, i) => {
        const tokens = diffWords(c.before, c.after);
        return (
          <div key={i}>
            {c.label && (
              <div className="text-xs font-semibold uppercase tracking-wide text-[#c8aa6e]">{c.label}</div>
            )}
            <p className="mt-1 max-w-[60ch] text-[11px] leading-relaxed">
              <span className="mr-1 font-semibold text-[#ff6b6b]">Previously:</span>
              {tokens
                .filter((t) => t.op !== "add")
                .map((t, j) =>
                  t.op === "remove" ? (
                    <del key={j} className="text-[#ff6b6b]/80 decoration-[#ff6b6b]/80">
                      {t.text}
                    </del>
                  ) : (
                    <span key={j} className="text-gray-400">
                      {t.text}
                    </span>
                  )
                )}
            </p>
            <p className="mt-1 max-w-[60ch] text-[11px] leading-relaxed">
              <span className="mr-1 font-semibold text-[#ffd100]">Now:</span>
              {tokens
                .filter((t) => t.op !== "remove")
                .map((t, j) =>
                  t.op === "add" ? (
                    <mark key={j} className="rounded-sm bg-[#ffd100]/25 text-[#ffd100]">
                      {t.text}
                    </mark>
                  ) : (
                    <span key={j} className="text-gray-400">
                      {t.text}
                    </span>
                  )
                )}
            </p>
          </div>
        );
      })}
    </div>
  );
}

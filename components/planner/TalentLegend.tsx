// Mirrors CompareLegend's shape/placement, but for the talent icon border
// states themselves rather than compare-to-Classic status dots. Swatches
// reuse the exact border classes TalentNode applies (border-green-500,
// border-amber-400, border-border/40) so the legend can't silently drift
// from the real icon styling.
const STATES = [
  { label: "Open", borderClass: "border-green-500" },
  { label: "Learning", borderClass: "border-green-500" },
  { label: "Maxed", borderClass: "border-amber-400" },
  { label: "Locked", borderClass: "border-border/40" },
];

export default function TalentLegend() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-foreground-muted">
      {STATES.map(({ label, borderClass }) => (
        <span key={label} className="flex items-center gap-1">
          <span className={`h-2.5 w-2.5 rounded-sm border-2 bg-surface ${borderClass}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

import type { Confidence } from "@/lib/wow-data";

const STYLES: Record<Confidence, string> = {
  confirmed: "border-green/50 text-green",
  datamined: "border-foreground-muted/50 text-foreground-muted",
  estimated: "border-foreground-muted/30 text-foreground-muted/70",
};

const LABELS: Record<Confidence, string> = {
  confirmed: "Confirmed",
  datamined: "Datamined",
  estimated: "Estimated",
};

export default function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${STYLES[confidence]}`}
    >
      {LABELS[confidence]}
    </span>
  );
}

import { mediumIconUrl, getClassTalentData, CLASS_ICON, classLabel } from "@/lib/wow-data";

const ALL_CLASS_IDS = Object.keys(CLASS_ICON);

export default function ClassPicker({
  selectedClassId,
  onSelect,
}: {
  selectedClassId: string;
  onSelect: (classId: string) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1 sm:grid-cols-9">
      {ALL_CLASS_IDS.map((classId) => {
        const icon = CLASS_ICON[classId];
        const hasData = !!getClassTalentData(classId);
        const selected = classId === selectedClassId;

        return (
          <button
            key={classId}
            type="button"
            disabled={!hasData}
            title={hasData ? undefined : "Data coming soon"}
            onClick={() => hasData && onSelect(classId)}
            className={`flex w-full flex-col items-center gap-0.5 rounded border p-1.5 transition-colors ${
              !hasData
                ? "cursor-not-allowed border-border/50 bg-surface/50 text-foreground-muted/50"
                : selected
                  ? "border-accent bg-surface-hover text-foreground"
                  : "border-border bg-surface text-foreground hover:border-accent/60 hover:bg-surface-hover"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediumIconUrl(icon)}
              alt=""
              className={`h-7 w-7 rounded-sm ${!hasData ? "opacity-40 grayscale" : ""}`}
            />
            <span className="text-center text-[10px] leading-tight">{classLabel(classId)}</span>
          </button>
        );
      })}
    </div>
  );
}

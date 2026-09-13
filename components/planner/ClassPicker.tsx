import { mediumIconUrl, getClassTalentData } from "@/lib/wow-data";

const ALL_CLASSES = [
  { id: "warrior", icon: "class_warrior" },
  { id: "paladin", icon: "class_paladin" },
  { id: "hunter", icon: "class_hunter" },
  { id: "rogue", icon: "class_rogue" },
  { id: "priest", icon: "class_priest" },
  { id: "shaman", icon: "class_shaman" },
  { id: "mage", icon: "class_mage" },
  { id: "warlock", icon: "class_warlock" },
  { id: "druid", icon: "class_druid" },
];

function label(classId: string): string {
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

export default function ClassPicker({
  selectedClassId,
  onSelect,
}: {
  selectedClassId: string;
  onSelect: (classId: string) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1 sm:grid-cols-9">
      {ALL_CLASSES.map(({ id: classId, icon }) => {
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
            <span className="text-center text-[10px] leading-tight">{label(classId)}</span>
          </button>
        );
      })}
    </div>
  );
}

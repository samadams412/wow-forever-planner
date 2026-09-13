import { mediumIconUrl } from "@/lib/wow-data";

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

const CLASSES_WITH_DATA = new Set(["warrior"]);

function label(classId: string): string {
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

export default function ClassPicker({
  allowedClasses,
  selectedClassId,
  onSelect,
}: {
  allowedClasses: string[];
  selectedClassId: string | null;
  onSelect: (classId: string) => void;
}) {
  const allowed = new Set(allowedClasses);

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        2. Choose your class
      </h2>
      <div className="mt-1.5 grid grid-cols-5 gap-1.5 sm:grid-cols-9">
        {ALL_CLASSES.map(({ id: classId, icon }) => {
          const isAllowedForRace = allowed.has(classId);
          const hasData = CLASSES_WITH_DATA.has(classId);
          const enabled = isAllowedForRace && hasData;
          const selected = classId === selectedClassId;
          const reason = !isAllowedForRace
            ? "Not available to this race"
            : !hasData
              ? "Data coming soon"
              : undefined;

          return (
            <button
              key={classId}
              type="button"
              disabled={!enabled}
              title={reason}
              onClick={() => enabled && onSelect(classId)}
              className={`flex h-19 w-full flex-col items-center justify-center gap-1 rounded border p-1 transition-colors ${
                !enabled
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
                className={`h-9 w-9 rounded-sm ${!enabled ? "opacity-40 grayscale" : ""}`}
              />
              <span className="text-center text-[10px] leading-tight">{label(classId)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

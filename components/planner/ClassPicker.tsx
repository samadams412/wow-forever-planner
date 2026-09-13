const ALL_CLASSES = [
  "warrior",
  "paladin",
  "hunter",
  "rogue",
  "priest",
  "shaman",
  "mage",
  "warlock",
  "druid",
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
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {ALL_CLASSES.map((classId) => {
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
              className={`rounded border px-2 py-1 text-sm transition-colors ${
                !enabled
                  ? "cursor-not-allowed border-border/50 bg-surface/50 text-foreground-muted/50"
                  : selected
                    ? "border-accent bg-surface-hover text-foreground"
                    : "border-border bg-surface text-foreground hover:border-accent/60 hover:bg-surface-hover"
              }`}
            >
              {label(classId)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

import type { Race } from "@/lib/wow-data";
import { getRacialsForRace, mediumIconUrl, CLASS_ICON } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";

const FACTION_STYLES = {
  Horde: {
    icon: "inv_misc_tournaments_tabard_orc",
    text: "text-red-400",
    border: "border-red-900/40",
  },
  Alliance: {
    icon: "inv_misc_tournaments_tabard_human",
    text: "text-blue-400",
    border: "border-blue-900/40",
  },
} as const;

function RaceBlock({ race }: { race: Race }) {
  const racials = getRacialsForRace(race.id);
  const style = FACTION_STYLES[race.faction];

  return (
    <div className={`rounded border ${style.border} bg-surface p-2`}>
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediumIconUrl(race.icon)} alt="" className="h-8 w-8 shrink-0 rounded-full" />
        <div>
          <div className="font-heading font-medium tracking-wide text-foreground">{race.name}</div>
          <div className="mt-0.5 flex gap-1">
            {race.allowedClasses.map((classId) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={classId}
                src={mediumIconUrl(CLASS_ICON[classId])}
                alt={classId}
                title={classId}
                className="h-4 w-4 rounded-sm"
              />
            ))}
          </div>
        </div>
      </div>
      <ul className={`mt-2 space-y-2.5 border-t ${style.border} pt-2.5`}>
        {racials.map((r) => (
          <li key={r.name} className="max-w-[60ch] text-sm leading-relaxed text-foreground/90">
            <span className="font-semibold text-accent">{r.name}:</span>{" "}
            {formatTooltipText(r.description)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FactionHeader({ faction }: { faction: keyof typeof FACTION_STYLES }) {
  const style = FACTION_STYLES[faction];
  return (
    <div className={`flex items-center gap-1.5 border-b ${style.border} pb-1`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediumIconUrl(style.icon)} alt="" className="h-4 w-4 rounded-sm" />
      <h3 className={`font-heading text-[11px] font-semibold uppercase tracking-wide ${style.text}`}>
        {faction}
      </h3>
    </div>
  );
}

export default function RaceReferenceTable({ races }: { races: Race[] }) {
  const horde = races.filter((r) => r.faction === "Horde");
  const alliance = races.filter((r) => r.faction === "Alliance");

  return (
    <section>
      <h2 className="font-heading text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Race reference
      </h2>
      <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FactionHeader faction="Horde" />
          {horde.map((r) => (
            <RaceBlock key={r.id} race={r} />
          ))}
        </div>
        <div className="space-y-1.5">
          <FactionHeader faction="Alliance" />
          {alliance.map((r) => (
            <RaceBlock key={r.id} race={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

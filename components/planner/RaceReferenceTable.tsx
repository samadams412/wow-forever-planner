import type { Race } from "@/lib/wow-data";
import { getRacialsForRace, mediumIconUrl } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";

const FACTION_STYLES = {
  Horde: {
    icon: "achievement_pvp_h_01",
    text: "text-red-400",
    border: "border-red-900/40",
  },
  Alliance: {
    icon: "achievement_pvp_a_01",
    text: "text-blue-400",
    border: "border-blue-900/40",
  },
} as const;

function classLabel(classId: string): string {
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

function RaceBlock({ race }: { race: Race }) {
  const racials = getRacialsForRace(race.id);
  const style = FACTION_STYLES[race.faction];

  return (
    <div className={`rounded border ${style.border} bg-surface p-2`}>
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediumIconUrl(race.icon)} alt="" className="h-8 w-8 shrink-0 rounded-sm" />
        <div>
          <div className="font-heading font-medium tracking-wide text-foreground">{race.name}</div>
          <div className="text-[11px] text-foreground-muted">
            {race.allowedClasses.map(classLabel).join(", ")}
          </div>
        </div>
      </div>
      <ul className={`mt-2 space-y-1 border-t ${style.border} pt-2`}>
        {racials.map((r) => (
          <li key={r.name} className="text-xs text-foreground-muted">
            <span className="font-semibold text-foreground">{r.name}:</span>{" "}
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

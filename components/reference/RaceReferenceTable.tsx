import type { Race } from "@/lib/wow-data";
import { getRacialsForRace, mediumIconUrl, CLASS_ICON } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";
import Collapsible from "@/components/site/Collapsible";
import IconFan from "@/components/site/IconFan";
import GoldRule from "@/components/site/GoldRule";

const FACTION_STYLES = {
  Horde: {
    icon: "inv_misc_tournaments_tabard_orc",
    text: "text-red-400",
  },
  Alliance: {
    icon: "inv_misc_tournaments_tabard_human",
    text: "text-blue-400",
  },
} as const;

function RaceBlock({ race }: { race: Race }) {
  const racials = getRacialsForRace(race.id);
  // First 3 racials' icons, so the collapsed header hints at what's inside
  // without needing every card expanded -- generic across every race.
  const fanIcons = racials.slice(0, 4).map((r) => r.icon);

  return (
    <Collapsible
      title={race.name}
      icon={
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediumIconUrl(race.icon)} alt="" className="h-8 w-8 shrink-0 rounded-full" />
          <IconFan icons={fanIcons} size={22} />
        </div>
      }
    >
      <div className="flex flex-wrap gap-1">
        {race.allowedClasses.map((classId) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={classId}
            src={mediumIconUrl(CLASS_ICON[classId])}
            alt={classId}
            title={classId}
            className="h-5 w-5 rounded-sm"
          />
        ))}
      </div>
      <ul className="mt-3 space-y-2.5">
        {racials.map((r) => (
          <li key={r.name} className="flex gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediumIconUrl(r.icon)} alt="" className="h-7 w-7 shrink-0 rounded-sm" />
            <p className="max-w-[60ch] text-sm leading-relaxed text-foreground/90">
              <span className="font-semibold text-accent">{r.name}:</span>{" "}
              {formatTooltipText(r.description)}
            </p>
          </li>
        ))}
      </ul>
    </Collapsible>
  );
}

function FactionHeader({ faction }: { faction: keyof typeof FACTION_STYLES }) {
  const style = FACTION_STYLES[faction];
  return (
    <div className="flex items-center gap-1.5 border-b border-border pb-1">
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
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Race reference
      </h2>
      <GoldRule className="mt-1.5" />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <FactionHeader faction="Horde" />
          {horde.map((r) => (
            <RaceBlock key={r.id} race={r} />
          ))}
        </div>
        <div className="space-y-2">
          <FactionHeader faction="Alliance" />
          {alliance.map((r) => (
            <RaceBlock key={r.id} race={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

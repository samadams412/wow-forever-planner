import type { QuestDetail, QuestDifficultyBand, QuestNpcPoint } from "@/lib/quests";
import { friz, morpheus } from "@/components/reference/quest-fonts";

// Start ("!") and turn-in ("?") icons -- the same classic quest-log assets the
// journal and the map use. Nothing new is introduced for this panel.
const NPC_ICON: Record<"start" | "end", string> = {
  start: "/images/icons/available.png",
  end: "/images/icons/complete.png",
};

// WoW's quest-difficulty colors, in order from hardest to trivial.
const BAND_COLOR: Record<QuestDifficultyBand["color"], string> = {
  red: "#e4483f",
  orange: "#f5892a",
  yellow: "#f9d342",
  green: "#54c254",
  grey: "#9aa0a6",
};

const SIDE_LABEL: Record<QuestDetail["side"], string> = {
  Alliance: "Alliance",
  Horde: "Horde",
  Both: "Both factions",
};

function NpcRow({ kind, npcs, fallbackText }: { kind: "start" | "end"; npcs: QuestNpcPoint[]; fallbackText: string | null }) {
  const label = kind === "start" ? "Start" : "Turn-in";
  return (
    <div>
      <dt className={`${morpheus.className} text-[11px] uppercase tracking-wide text-[#c9a961]`}>{label}</dt>
      <dd className={`${friz.className} mt-0.5 space-y-1 text-sm text-[#e8dcc0]`}>
        {npcs.length > 0 ? (
          npcs.map((npc, i) => (
            <div key={`${npc.name}-${i}`} className="flex items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- fixed 16px icon from /public, nothing to optimize */}
              <img src={NPC_ICON[kind]} alt="" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="block">{npc.name}</span>
                {npc.zone && (
                  <span className="block text-xs text-[#e8dcc0]/70">
                    {npc.zone}
                    {npc.x !== null && npc.y !== null ? ` ${npc.x}, ${npc.y}` : ""}
                  </span>
                )}
              </span>
            </div>
          ))
        ) : (
          <span className="text-xs italic text-[#e8dcc0]/70">{fallbackText ?? "Unknown"}</span>
        )}
      </dd>
    </div>
  );
}

export default function QuestInfo({ quest }: { quest: QuestDetail }) {
  const requiredText = quest.requiredLevel !== null ? `${quest.requiredLevel}` : "--";
  return (
    <section
      aria-label="Quest information"
      className="rounded-sm border-2 border-[#8a6d3b]/70 bg-[#21190f] p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
    >
      <dl className="grid gap-3">
        <NpcRow kind="start" npcs={quest.startNpcs} fallbackText={quest.startItemText ?? quest.giverName} />
        <NpcRow kind="end" npcs={quest.endNpcs} fallbackText={quest.turnInName} />

        <div className="grid grid-cols-2 gap-3 border-t border-[#8a6d3b]/40 pt-3">
          <div>
            <dt className={`${morpheus.className} text-[11px] uppercase tracking-wide text-[#c9a961]`}>Level</dt>
            <dd className={`${friz.className} mt-0.5 text-sm text-[#e8dcc0]`}>{quest.level ?? "--"}</dd>
          </div>
          <div>
            <dt className={`${morpheus.className} text-[11px] uppercase tracking-wide text-[#c9a961]`}>Requires level</dt>
            <dd className={`${friz.className} mt-0.5 text-sm text-[#e8dcc0]`}>{requiredText}</dd>
          </div>
          <div>
            <dt className={`${morpheus.className} text-[11px] uppercase tracking-wide text-[#c9a961]`}>Side</dt>
            <dd className={`${friz.className} mt-0.5 text-sm text-[#e8dcc0]`}>{SIDE_LABEL[quest.side]}</dd>
          </div>
          {quest.classRestriction && (
            <div>
              <dt className={`${morpheus.className} text-[11px] uppercase tracking-wide text-[#c9a961]`}>Class</dt>
              <dd className={`${friz.className} mt-0.5 text-sm text-[#e8dcc0]`}>{quest.classRestriction}</dd>
            </div>
          )}
          <div>
            <dt className={`${morpheus.className} text-[11px] uppercase tracking-wide text-[#c9a961]`}>Quest ID</dt>
            <dd className={`${friz.className} mt-0.5 text-sm text-[#e8dcc0]`}>{quest.id}</dd>
          </div>
        </div>

        {quest.difficultyBands.length > 0 && (
          <div className="border-t border-[#8a6d3b]/40 pt-3">
            <dt className={`${morpheus.className} text-[11px] uppercase tracking-wide text-[#c9a961]`}>Difficulty</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {quest.difficultyBands.map((band) => (
                <span
                  key={band.color}
                  title={`${band.color} from level ${band.level}`}
                  className={`${friz.className} inline-flex items-center gap-1.5 rounded border border-[#8a6d3b]/60 bg-[#21190f]/90 px-2 py-0.5 text-xs text-[#e8dcc0]`}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BAND_COLOR[band.color] }} aria-hidden="true" />
                  {band.level}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

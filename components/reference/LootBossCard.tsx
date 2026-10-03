import BossPortrait from "@/components/reference/BossPortrait";
import LootItemPill from "@/components/reference/LootItemPill";
import type { LootBoss } from "@/lib/dungeon-loot";

const KIND_LABEL: Partial<Record<LootBoss["kind"], string>> = {
  trash: "Trash",
  rare: "Rare Spawn",
  object: "Object",
  quest: "Quest NPC",
};

// Same card language as Card.tsx/blog list items/reference collapsibles --
// rounded-lg, border-border, bg-surface -- just not a link (nothing to
// navigate to), so no .fx-standard-hover.
export default function LootBossCard({
  boss,
  dungeonId,
  anchorId,
}: {
  boss: LootBoss;
  dungeonId: string;
  anchorId?: string;
}) {
  const kindLabel = KIND_LABEL[boss.kind];
  return (
    <div id={anchorId} className="scroll-mt-20 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <BossPortrait src={boss.portraitUrl} alt="" />
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3 className="font-heading text-base font-semibold text-accent">{boss.name}</h3>
          {boss.level !== null && <span className="text-[11px] text-foreground-muted">Level {boss.level}</span>}
          {kindLabel && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted bg-foreground-muted/10">
              {kindLabel}
            </span>
          )}
        </div>
      </div>
      {boss.trigger && (
        <p className="mt-2 rounded border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-xs leading-relaxed text-foreground-muted">
          {boss.trigger.flag && <span className="mr-1 font-semibold uppercase tracking-wide text-accent">{boss.trigger.flag}:</span>}
          {boss.trigger.text}
        </p>
      )}
      {boss.abilities?.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {boss.abilities.map((ability, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed">
              {/* eslint-disable-next-line @next/next/no-img-element -- small hotlinked spell icon, same discipline as LootItemPill */}
              <img src={`https://foreverchanges.pro${ability.icon}`} alt="" width={20} height={20} className="mt-0.5 h-5 w-5 shrink-0 rounded" />
              <span>
                {ability.name && <strong className="text-foreground">{ability.name}</strong>}
                {ability.flags?.length > 0 && (
                  <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                    {ability.flags.join(" · ")}
                  </span>
                )}
                <span className="block text-foreground-muted">{ability.description}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {boss.items.map((item, i) => (
          <LootItemPill key={`${item.name}-${i}`} item={item} tooltipId={`${dungeonId}:${boss.name}:${i}`} showSlotType />
        ))}
      </div>
    </div>
  );
}

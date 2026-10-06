import { mediumIconUrl } from "@/lib/wow-data";

// Shared quest-reward pills -- the journal's XP/money/reputation row, the
// dungeon quest cards, and the /reference/quests table all render guaranteed
// rewards with these, so they can't drift. A small dark pill matching
// LootItemPill's icon+label language. `compact` is the table-row size: the
// same look, just tighter padding and icons, so a row of pills doesn't push
// the table's height.

const MONEY_ICON: Record<"gold" | "silver" | "copper", string> = {
  gold: "https://wow.zamimg.com/images/icons/money-gold.gif",
  silver: "https://wow.zamimg.com/images/icons/money-silver.gif",
  copper: "https://wow.zamimg.com/images/icons/money-copper.gif",
};

const PILL_CLASS = {
  normal: "gap-1.5 px-2 py-1 text-xs",
  compact: "gap-1 px-1.5 py-0.5 text-[11px]",
} as const;
const ICON_CLASS = { normal: "h-4 w-4", compact: "h-3.5 w-3.5" } as const;
const COIN_CLASS = { normal: "h-3.5 w-3.5", compact: "h-3 w-3" } as const;

export function RewardPill({
  iconUrl,
  children,
  compact = false,
}: {
  iconUrl: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const size = compact ? "compact" : "normal";
  return (
    <span
      className={`inline-flex items-center rounded border border-[#8a6d3b]/60 bg-[#21190f]/90 font-semibold text-[#e8dcc0] ${PILL_CLASS[size]}`}
    >
      <img src={iconUrl} alt="" className={`${ICON_CLASS[size]} shrink-0 rounded-sm`} />
      {children}
    </span>
  );
}

// Money as gold / silver / copper icons. Zero denominations are dropped, so
// "60s" renders as silver only.
export function MoneyRewardRow({ copper, compact = false }: { copper: number; compact?: boolean }) {
  const size = compact ? "compact" : "normal";
  const gold = Math.floor(copper / 10000);
  const silver = Math.floor((copper % 10000) / 100);
  const remainder = copper % 100;
  return (
    <span
      className={`inline-flex items-center rounded border border-[#8a6d3b]/60 bg-[#21190f]/90 font-semibold text-[#e8dcc0] ${PILL_CLASS[size]}`}
    >
      <img src={mediumIconUrl("inv_misc_coin_02")} alt="" className={`${ICON_CLASS[size]} shrink-0 rounded-sm`} />
      {gold > 0 && (
        <span className="inline-flex items-center gap-0.5">
          {gold} <img src={MONEY_ICON.gold} alt="gold" className={COIN_CLASS[size]} />
        </span>
      )}
      {silver > 0 && (
        <span className="inline-flex items-center gap-0.5">
          {silver} <img src={MONEY_ICON.silver} alt="silver" className={COIN_CLASS[size]} />
        </span>
      )}
      {remainder > 0 && (
        <span className="inline-flex items-center gap-0.5">
          {remainder} <img src={MONEY_ICON.copper} alt="copper" className={COIN_CLASS[size]} />
        </span>
      )}
    </span>
  );
}

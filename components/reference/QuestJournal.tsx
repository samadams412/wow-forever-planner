import Link from "next/link";
import { ItemLinkSourceProvider } from "@/components/reference/ItemLinkSource";
import LootItemPill from "@/components/reference/LootItemPill";
import { friz, morpheus } from "@/components/reference/quest-fonts";
import QuestBackLink from "@/components/reference/QuestBackLink";
import { mediumIconUrl } from "@/lib/wow-data";
import type { QuestDetail } from "@/lib/quests";

// The journal is the quest's text and rewards. The map, quest info and chain
// are separate components placed beside or below it on the quest page.

const MONEY_ICON: Record<"gold" | "silver" | "copper", string> = {
  gold: "https://wow.zamimg.com/images/icons/money-gold.gif",
  silver: "https://wow.zamimg.com/images/icons/money-silver.gif",
  copper: "https://wow.zamimg.com/images/icons/money-copper.gif",
};

function JournalHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className={`${morpheus.className} text-lg tracking-wide text-(--ink2)`}>{children}</h2>
  );
}

// A collapsed-by-default dialogue block, styled like the journal's own
// headings -- a native <details>, so it needs no client JS.
function DialogueDropdown({ title, text }: { title: string; text: string }) {
  return (
    <details className="mt-3">
      <summary
        className={`${morpheus.className} cursor-pointer select-none text-sm tracking-wide text-(--ink2) hover:opacity-80`}
      >
        {title}
      </summary>
      <div className={`${friz.className} mt-2 space-y-2 text-sm leading-relaxed text-black`}>
        {text.split(/\n+/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </details>
  );
}

// XP/money "will also receive" row item -- a small dark pill matching
// LootItemPill's own icon+label language, reused here for the non-item
// guaranteed rewards (XP, money denominations) rather than a bare text line.
function RewardPill({ iconUrl, children }: { iconUrl: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-[#8a6d3b]/60 bg-[#21190f]/90 px-2 py-1 text-xs font-semibold text-[#e8dcc0]">
      <img src={iconUrl} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
      {children}
    </span>
  );
}

function MoneyRewardRow({ copper }: { copper: number }) {
  const gold = Math.floor(copper / 10000);
  const silver = Math.floor((copper % 10000) / 100);
  const remainder = copper % 100;
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-[#8a6d3b]/60 bg-[#21190f]/90 px-2 py-1 text-xs font-semibold text-[#e8dcc0]">
      <img src={mediumIconUrl("inv_misc_coin_02")} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
      {gold > 0 && (
        <span className="inline-flex items-center gap-0.5">
          {gold} <img src={MONEY_ICON.gold} alt="gold" className="h-3.5 w-3.5" />
        </span>
      )}
      {silver > 0 && (
        <span className="inline-flex items-center gap-0.5">
          {silver} <img src={MONEY_ICON.silver} alt="silver" className="h-3.5 w-3.5" />
        </span>
      )}
      {remainder > 0 && (
        <span className="inline-flex items-center gap-0.5">
          {remainder} <img src={MONEY_ICON.copper} alt="copper" className="h-3.5 w-3.5" />
        </span>
      )}
    </span>
  );
}

export default function QuestJournal({
  quest,
  backHref,
  backLabel,
}: {
  quest: QuestDetail;
  backHref: string;
  backLabel: string;
}) {
  const narrative = quest.narrative;
  const hasGuaranteed =
    quest.xp > 0 || quest.money > 0 || quest.reputation.length > 0 || quest.guaranteedRewards.length > 0;
  const hasRewards = hasGuaranteed || quest.choiceRewards.length > 0;

  return (
    <div className="relative rounded-sm border-2 border-[#8a6d3b]/70 bg-[#21190f] p-2 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] sm:p-3">
      <QuestBackLink fallbackHref={backHref} fallbackLabel={backLabel} />

      <div className="spellbook-page relative min-h-105 rounded-sm border border-[#8a6d3b]/50 bg-(--pg) p-3 pt-12 sm:min-h-115 sm:p-5 sm:pt-14">
        <h1 className={`${morpheus.className} text-center text-2xl text-(--ink2) sm:text-3xl`}>{quest.name}</h1>

        <p className={`${friz.className} mt-2 text-center text-sm text-(--ink2)`}>
          {quest.locationName ? (
            quest.locationContinent && quest.locationZoneId !== null ? (
              <Link
                href={`/reference/map/${quest.locationContinent}#sel=zone:${quest.locationZoneId}`}
                className="underline decoration-dotted hover:opacity-80"
              >
                {quest.locationName}
              </Link>
            ) : (
              quest.locationName
            )
          ) : (
            "Location unknown"
          )}
          {quest.requiredLevel !== null ? ` -- Requires level ${quest.requiredLevel}` : ""}
        </p>

        {quest.giverName && (
          <p className={`${friz.className} mt-1 text-center text-xs text-(--ink2)/80`}>Quest Giver: {quest.giverName}</p>
        )}
        {quest.turnInName && (
          <p className={`${friz.className} mt-1 text-center text-xs text-(--ink2)/80`}>Turn In: {quest.turnInName}</p>
        )}

        {narrative?.objectives && (
          <p className={`${friz.className} mt-3 text-sm italic leading-relaxed text-(--ink2)`}>{narrative.objectives}</p>
        )}

        <div className="mt-5 border-t border-(--ink2)/25 pt-4">
          <JournalHeading>Description</JournalHeading>
          {narrative?.details ? (
            <div className={`${friz.className} mt-2 space-y-2 text-sm leading-relaxed text-black`}>
              {narrative.details.split(/\n+/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : (
            <p className={`${friz.className} mt-2 text-sm italic text-black/70`}>
              {narrative
                ? "No description text is available for this quest."
                : "No narrative text is available for this quest yet -- it's new to Forever, and neither of the sources this site uses for quest text has an entry for it."}
            </p>
          )}

          {narrative && narrative.objectiveText.length > 0 && (
            <ul className={`${friz.className} mt-3 list-disc space-y-1 pl-5 text-sm text-black`}>
              {narrative.objectiveText.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}

          {narrative?.requestItemsText && <DialogueDropdown title="Partial Dialogue" text={narrative.requestItemsText} />}
          {narrative?.offerRewardText && <DialogueDropdown title="Completed Dialogue" text={narrative.offerRewardText} />}
        </div>

        {quest.mentionedItems.length > 0 && (
          <div className="mt-5 border-t border-(--ink2)/25 pt-4">
            <JournalHeading>Related Items</JournalHeading>
            <ItemLinkSourceProvider from={`/quests/${quest.id}`} fromLabel={quest.name}>
              <div className="mt-2 flex flex-wrap gap-2">
                {quest.mentionedItems.map((item, i) => (
                  <LootItemPill key={`m-${i}`} item={item} tooltipId={`quest-detail:${quest.id}:m:${i}`} />
                ))}
              </div>
            </ItemLinkSourceProvider>
          </div>
        )}

        {hasRewards && (
          <div className="mt-5 border-t border-(--ink2)/25 pt-4">
            <JournalHeading>Rewards</JournalHeading>
            <ItemLinkSourceProvider from={`/quests/${quest.id}`} fromLabel={quest.name}>
              {quest.choiceRewards.length > 0 && (
                <div className="mt-3">
                  <p className={`${friz.className} text-xs text-black`}>You will be able to choose one of these rewards:</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {quest.choiceRewards.map((item, i) => (
                      <LootItemPill key={`r-${i}`} item={item} tooltipId={`quest-detail:${quest.id}:r:${i}`} />
                    ))}
                  </div>
                </div>
              )}
              {hasGuaranteed && (
                <div className="mt-3">
                  <p className={`${friz.className} text-xs text-black`}>You will also receive:</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {quest.guaranteedRewards.map((item, i) => (
                      <LootItemPill key={`k-${i}`} item={item} tooltipId={`quest-detail:${quest.id}:k:${i}`} />
                    ))}
                    {quest.xp > 0 && <RewardPill iconUrl={mediumIconUrl("xp_icon")}>{quest.xp.toLocaleString()}</RewardPill>}
                    {quest.money > 0 && <MoneyRewardRow copper={quest.money} />}
                    {quest.reputation.map((r) => (
                      <RewardPill key={r.faction} iconUrl={mediumIconUrl("achievement_reputation_01")}>
                        {r.amount > 0 ? "+" : "−"}
                        {Math.abs(r.amount).toLocaleString()} {r.faction}
                      </RewardPill>
                    ))}
                  </div>
                </div>
              )}
            </ItemLinkSourceProvider>
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { QuestChainQuest, QuestChainLink, QuestDetail } from "@/lib/quests";
import { friz, morpheus } from "@/components/reference/quest-fonts";
import { mediumIconUrl } from "@/lib/wow-data";

// The quest's place in its chain as a vertical timeline, one step per row. The
// current quest is highlighted with up/down arrows to its neighbours. Other
// quests link to their own pages. Rendered only when the quest has chain data
// (the page doesn't mount this component otherwise).

function ChainQuestLink({ link }: { link: QuestChainLink }) {
  return (
    <Link href={`/quests/${link.id}`} className="underline decoration-dotted hover:text-[#f0c040]">
      {link.name}
    </Link>
  );
}

function ChainRow({
  quest,
  prevQuest,
  nextQuest,
}: {
  quest: QuestChainQuest;
  prevQuest: QuestChainLink | null;
  nextQuest: QuestChainLink | null;
}) {
  const current = quest.isCurrent;
  return (
    <div
      className={`rounded border px-3 py-2 ${
        current ? "border-[#f0c040] bg-[#2d2010]" : "border-[#8a6d3b]/50 bg-[#21190f]/60"
      }`}
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_auto]">
        <div className="min-w-0">
          <p className={`${friz.className} text-sm text-[#e8dcc0]`}>
            {quest.level && <span className="mr-1.5 text-xs text-[#c9a961]">[{quest.level}]</span>}
            {current ? (
              <span className="font-semibold text-[#f0c040]">{quest.name}</span>
            ) : quest.variants ? (
              <span>{quest.name}</span>
            ) : (
              <Link href={`/quests/${quest.questId}`} className="font-semibold underline decoration-dotted hover:text-[#f0c040]">
                {quest.name}
              </Link>
            )}
            {current && <span className="ml-2 text-[10px] uppercase tracking-wide text-[#c9a961]">This quest</span>}
          </p>
          {quest.variants && (
            <p className={`${friz.className} mt-1 flex flex-wrap gap-x-2 text-xs text-[#e8dcc0]/80`}>
              {quest.variants.map((v) => (
                <Link key={v.questId} href={`/quests/${v.questId}`} className="underline decoration-dotted hover:text-[#f0c040]">
                  {v.label}
                </Link>
              ))}
            </p>
          )}
        </div>

        <p className={`${friz.className} text-xs italic leading-relaxed text-[#e8dcc0]/85`}>{quest.objectiveText ?? ""}</p>

        <p className={`${friz.className} text-xs text-[#e8dcc0]/85`}>
          {quest.giverName && (
            <>
              {quest.giverName}
              {quest.giverZone && <span className="block text-[#e8dcc0]/60">{quest.giverZone}</span>}
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
          {quest.xpText && <span className={`${friz.className} text-xs font-semibold text-[#f0c040]`}>{quest.xpText}</span>}
          {quest.rewardItem?.icon && (
            <span className={`${friz.className} inline-flex items-center gap-1 text-xs text-[#e8dcc0]`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- remote Zamimg icon at a fixed 18px, same as LootItemPill */}
              <img src={mediumIconUrl(quest.rewardItem.icon)} alt="" className="h-[18px] w-[18px] rounded-sm" />
              {quest.rewardItem.name}
            </span>
          )}
          {current && (
            <span className="flex items-center gap-1">
              {prevQuest && (
                <Link
                  href={`/quests/${prevQuest.id}`}
                  aria-label={`Previous quest: ${prevQuest.name}`}
                  title={`Previous: ${prevQuest.name}`}
                  className="rounded border border-[#8a6d3b]/60 p-1 text-[#c9a961] hover:border-[#c9a961] hover:text-[#f0c040]"
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
              {nextQuest && (
                <Link
                  href={`/quests/${nextQuest.id}`}
                  aria-label={`Next quest: ${nextQuest.name}`}
                  title={`Next: ${nextQuest.name}`}
                  className="rounded border border-[#8a6d3b]/60 p-1 text-[#c9a961] hover:border-[#c9a961] hover:text-[#f0c040]"
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuestChain({ quest }: { quest: QuestDetail }) {
  const chain = quest.chain;
  if (!chain) return null;
  return (
    <section
      aria-labelledby="quest-chain-heading"
      className="rounded-sm border-2 border-[#8a6d3b]/70 bg-[#21190f] p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] sm:p-5"
    >
      <h2 id="quest-chain-heading" className={`${morpheus.className} text-lg tracking-wide text-[#e8dcc0]`}>
        Quest Chain
      </h2>
      {chain.subtitle && <p className={`${friz.className} mt-1 text-xs text-[#e8dcc0]/70`}>{chain.subtitle}</p>}

      <ol className="mt-4">
        {chain.steps.map((step, i) => {
          const isLast = i === chain.steps.length - 1;
          return (
            <li key={step.stepNumber} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`${morpheus.className} flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                    step.isCurrentStep ? "border-[#f0c040] bg-[#f0c040] text-[#21190f]" : "border-[#8a6d3b] text-[#c9a961]"
                  }`}
                  aria-label={`Step ${step.stepNumber}`}
                >
                  {step.stepNumber}
                </span>
                {!isLast && <span className="my-1 w-px flex-1 bg-[#8a6d3b]/60" aria-hidden="true" />}
              </div>
              <div className={`min-w-0 flex-1 space-y-2 ${isLast ? "" : "pb-4"}`}>
                {step.quests.map((q, j) => (
                  <ChainRow
                    key={`${q.questId}-${j}`}
                    quest={q}
                    prevQuest={q.isCurrent ? quest.prevQuest : null}
                    nextQuest={q.isCurrent ? quest.nextQuest : null}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      {quest.nextQuestInChain && (
        <p className={`${friz.className} mt-4 border-t border-[#8a6d3b]/40 pt-3 text-xs text-[#e8dcc0]/85`}>
          Leads to: <ChainQuestLink link={quest.nextQuestInChain} />
        </p>
      )}
    </section>
  );
}

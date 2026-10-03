import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import QuestsTable from "@/components/reference/QuestsTable";
import ItemsSearchInput from "@/components/reference/ItemsSearchInput";
import {
  getQuestCount,
  getQuestLocationKindCounts,
  getTextSourceCounts,
  queryQuests,
  LOCATION_KIND_TABS,
  type QuestLocationKind,
  type QuestSortKey,
} from "@/lib/quests";

const SORT_KEYS: QuestSortKey[] = ["name", "level", "requiredLevel", "side", "location", "xp"];

export const metadata: Metadata = {
  title: "Quests",
  description:
    "Every quest in the World of Warcraft: Forever beta client, filterable by zone/dungeon/raid/battleground, with level ranges and rewards, sourced from the beta client.",
  alternates: { canonical: "/reference/quests" },
};

type FilterParams = {
  locationKind: QuestLocationKind | "all";
  q: string;
  sort?: QuestSortKey;
  dir?: "asc" | "desc";
  page?: number;
};

function buildHref(params: FilterParams): string {
  const usp = new URLSearchParams();
  if (params.locationKind !== "all") usp.set("kind", params.locationKind);
  if (params.q) usp.set("q", params.q);
  if (params.sort) usp.set("sort", params.sort);
  if (params.sort && params.dir === "desc") usp.set("dir", "desc");
  if (params.page && params.page > 1) usp.set("page", String(params.page));
  const qs = usp.toString();
  return qs ? `/reference/quests?${qs}` : "/reference/quests";
}

// Clicking a column header: same column toggles direction, a different
// column switches to it defaulting to ascending.
function sortHref(base: FilterParams, key: QuestSortKey): string {
  const next: FilterParams = { ...base, page: undefined };
  if (base.sort === key) {
    next.sort = key;
    next.dir = base.dir === "asc" ? "desc" : "asc";
  } else {
    next.sort = key;
    next.dir = "asc";
  }
  return buildHref(next);
}

export default async function QuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const resolved = await searchParams;
  const locationKind = (LOCATION_KIND_TABS.some((t) => t.value === resolved.kind) ? resolved.kind : "all") as
    | QuestLocationKind
    | "all";
  const q = resolved.q ?? "";
  const sort = SORT_KEYS.find((k) => k === resolved.sort);
  const dir = resolved.dir === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number(resolved.page) || 1);

  const totalCount = getQuestCount();
  const counts = getQuestLocationKindCounts();
  const textSourceCounts = getTextSourceCounts();
  const result = queryQuests({ locationKind, q, sort, dir, page });
  const baseFilters: FilterParams = { locationKind, q, sort, dir };

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-8 sm:px-4">
      <Breadcrumbs items={[{ label: "Reference", href: "/reference" }, { label: "Quests" }]} />

      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Quests</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        Every quest in the WoW Forever beta client -- {totalCount.toLocaleString()} total. This listing covers quest
        name, level, required level, side, location, XP/money, and rewards. Click a quest name for its full
        description, objectives, and rewards -- sourced for the {textSourceCounts.cmangos.toLocaleString()} quests
        carried over from Classic (see the attribution below).
      </p>
      <p className="mt-2 max-w-[70ch] rounded border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-xs text-amber-300">
        Data-confidence note: Blizzard&apos;s recent dungeon quest XP/reward nerfs may not yet be reflected here if this
        pull predates that change or the upstream source hasn&apos;t caught up -- treat reward values as provisional,
        not confirmed current.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded border border-border bg-surface p-0.5 text-xs">
          {LOCATION_KIND_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={buildHref({ ...baseFilters, locationKind: tab.value })}
              className={`rounded-sm px-2 py-1 transition-colors ${
                locationKind === tab.value ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {tab.label} <span className="text-foreground-muted">{counts[tab.value].toLocaleString()}</span>
            </Link>
          ))}
        </div>
        <ItemsSearchInput initialValue={q} placeholder="Search quest names..." />
      </div>

      <p className="mt-3 text-xs text-foreground-muted">
        {result.total.toLocaleString()} quest{result.total === 1 ? "" : "s"}
        {q ? ` matching "${q}"` : ""}
      </p>

      <QuestsTable quests={result.quests} sort={sort} dir={dir} sortHref={(key) => sortHref(baseFilters, key)} />

      {result.pageCount > 1 && (
        <nav className="mt-4 flex items-center justify-between border-t border-border pt-4">
          {result.page > 1 ? (
            <Link
              href={buildHref({ ...baseFilters, page: result.page - 1 })}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:bg-surface-hover"
            >
              &larr; Previous
            </Link>
          ) : (
            <div />
          )}
          <span className="text-xs text-foreground-muted">
            Page <strong className="text-foreground">{result.page}</strong> of {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Link
              href={buildHref({ ...baseFilters, page: result.page + 1 })}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:bg-surface-hover"
            >
              Next &rarr;
            </Link>
          ) : (
            <div />
          )}
        </nav>
      )}

      <div className="mt-6 max-w-[70ch] text-xs leading-relaxed text-foreground-muted">
        <p>
          {textSourceCounts.cmangos.toLocaleString()} quests carried over from Classic are sourced from{" "}
          <a
            href="https://github.com/cmangos/classic-db"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline hover:text-accent-hover"
          >
            cMaNGOS classic-db
          </a>{" "}
          (GPL-3.0), a reconstruction of the 1.12 world. {textSourceCounts.wowhead.toLocaleString()} quests new to
          Forever with no Classic-era precedent have text sourced from{" "}
          <a
            href="https://www.wowhead.com/forever"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline hover:text-accent-hover"
          >
            Wowhead&apos;s Forever database
          </a>
          
           {" "}Quest text is &copy; Blizzard Entertainment.
        </p>
      </div>
    </main>
  );
}

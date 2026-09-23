import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Card from "@/components/site/Card";
import { mediumIconUrl } from "@/lib/wow-data";

export const metadata: Metadata = {
  title: "WoW Forever Race & Class Reference",
  description:
    "Browse World of Warcraft: Forever race and class rules, allowed race/class combinations, and racials at a glance, plus deep dives on the Legacy System and class spellbooks.",
};

export default function ReferencePage() {
  return (
    <main className="w-full">
      <div className="relative flex min-h-64 items-end overflow-hidden px-6 py-10 sm:min-h-80 sm:py-14">
        {/* Official World of Warcraft: Forever announce still, used with
            credit -- see the caption below. Same treatment as the guides
            hero: full-bleed image, warm color-grade, then a darkening
            gradient so the title/intro stay readable over it. */}
        <Image
          src="/images/reference/hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "50% 45%" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(135deg, rgba(201,169,97,0.1), rgba(13,11,7,0.2))",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(to top, rgba(13,11,7,0.9) 0%, rgba(13,11,7,0.55) 22%, transparent 48%)",
          }}
        />

        <div className="relative mx-auto w-full max-w-3xl">
          <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            Reference
          </h1>
          <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            Race and class rules, racials, Legacy Perks, and every class spellbook -- browsable on their own or
            inline as part of the{" "}
            <Link href="/planner" className="text-accent hover:underline">
              planner
            </Link>
            .
          </p>
        </div>

        <p className="absolute inset-x-0 bottom-1.5 text-center text-[10px] text-foreground-muted/60">
          Image: Official World of Warcraft: Forever announce still, courtesy of Blizzard Entertainment
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="grid gap-3">
          <Card
            href="/reference/legacy-perks"
            title="Legacy Perks"
            description="Account-wide perks and cosmetic rewards from the Legacy System -- all three perk trees plus known reward items, sourced from the BlizzCon 2026 demo and Wowhead's beta coverage. Static reference until the point cap is confirmed."
            icon={
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={mediumIconUrl("inv_misc_book_09")} alt="" className="h-7 w-7 rounded-sm" />
            }
          />
          <Card
            href="/reference/class-spellbooks"
            title="Class Spellbooks"
            description="Every trainer-taught spell for each class, every rank, read straight from the WoW Forever beta client's own files, plus new baseline abilities inferred from talent tooltips."
            icon={
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={mediumIconUrl("inv_misc_book_11")} alt="" className="h-7 w-7 rounded-sm" />
            }
          />
          <Card
            href="/reference/racials"
            title="Racials"
            description="Race and racial ability reference for every class, Horde and Alliance side by side."
            icon={
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={mediumIconUrl("inv_misc_tournaments_tabard_orc")} alt="" className="h-7 w-7 rounded-sm" />
            }
          />
          <Card
            href="/reference/dungeons"
            title="Dungeon Level Ranges"
            description="Every dungeon on one level-range timeline -- the new launch dungeons alongside all of Classic's, with details on the new ones."
            icon={
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={mediumIconUrl("inv_misc_key_03")} alt="" className="h-7 w-7 rounded-sm" />
            }
          />
          <Card
            href="/reference/dungeons/loot"
            title="Dungeon Loot"
            description="Boss-by-boss loot and quest rewards for every dungeon, read straight from the beta client via foreverchanges.pro -- wowtbc.gg's community reports fill in the couple of dungeons it hasn't reached yet."
            icon={
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={mediumIconUrl("inv_misc_bag_10")} alt="" className="h-7 w-7 rounded-sm" />
            }
          />
          <Card
            href="/reference/professions"
            title="Professions"
            description="New recipes, gear, and titles coming to every crafting and gathering profession in Forever."
            icon={
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={mediumIconUrl("trade_engineering")} alt="" className="h-7 w-7 rounded-sm" />
            }
          />
          <Card
            href="/reference/items"
            title="Items"
            description="Every item in the beta client, filterable by new/changed/unchanged-since-Classic, sourced from foreverchanges.pro."
            icon={
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={mediumIconUrl("inv_misc_gem_01")} alt="" className="h-7 w-7 rounded-sm" />
            }
          />
        </div>
      </div>
    </main>
  );
}

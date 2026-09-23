import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import { getAllProfessionSummaries } from "@/lib/profession-recipes";
import { getAllGatheringSummaries } from "@/lib/gathering-professions";
import { mediumIconUrl } from "@/lib/wow-data";

const PROFESSION_ICON: Record<string, string> = {
  alchemy: "trade_alchemy",
  blacksmithing: "trade_blacksmithing",
  cooking: "inv_misc_food_15",
  enchanting: "trade_engraving",
  engineering: "trade_engineering",
  "first-aid": "spell_holy_sealofsacrifice",
  leatherworking: "trade_leatherworking",
  tailoring: "trade_tailoring",
  mining: "trade_mining",
  herbalism: "trade_herbalism",
  skinning: "inv_misc_pelt_wolf_01",
};

export const metadata: Metadata = {
  title: "Professions",
  description:
    "Every crafting profession recipe in World of Warcraft: Forever -- reagents, source, and skill-up thresholds, sourced from the WoW Forever beta client.",
};

export default function ProfessionsPage() {
  const professions = getAllProfessionSummaries();
  const gathering = getAllGatheringSummaries();

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
      <Breadcrumbs items={[{ label: "Reference", href: "/reference" }, { label: "Professions" }]} />
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Professions</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        Every recipe for every crafting profession in Forever -- reagents, trainer or recipe source, and
        skill-up thresholds. Alchemy and Blacksmithing also have a full leveling-1-to-300 guide and
        Merchant&apos;s Favor breakdown; the rest are coming soon.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {professions.map((profession) => (
          <Link
            key={profession.id}
            href={`/reference/professions/${profession.id}`}
            className="group flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent hover:bg-surface-hover"
          >
            {PROFESSION_ICON[profession.id] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediumIconUrl(PROFESSION_ICON[profession.id])}
                alt=""
                className="h-10 w-10 shrink-0 rounded border border-border/50"
              />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-foreground group-hover:text-accent">{profession.name}</h2>
              <p className="mt-0.5 text-xs text-foreground-muted">
                {profession.recipeCount} recipes{profession.hasLeveling ? " -- leveling guide available" : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {gathering.length > 0 && (
        <>
          <h2 className="mt-8 font-heading text-lg font-semibold tracking-wide text-accent">Gathering</h2>
          <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
            Mining, Herbalism, and Skinning -- what each node or beast yields, the skill it asks, and where to
            work from 1 to 300.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {gathering.map((profession) => (
              <Link
                key={profession.id}
                href={`/reference/professions/${profession.id}`}
                className="group flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent hover:bg-surface-hover"
              >
                {PROFESSION_ICON[profession.id] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediumIconUrl(PROFESSION_ICON[profession.id])}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded border border-border/50"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium text-foreground group-hover:text-accent">{profession.name}</h2>
                  <p className="mt-0.5 text-xs text-foreground-muted">{profession.itemCount} nodes/bands</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

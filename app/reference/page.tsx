import type { Metadata } from "next";
import Link from "next/link";
import Card from "@/components/site/Card";
import { mediumIconUrl } from "@/lib/wow-data";

export const metadata: Metadata = {
  title: "WoW Forever Race & Class Reference",
  description:
    "Browse World of Warcraft: Forever race and class rules, allowed race/class combinations, and racials at a glance, plus deep dives on the Legacy System and class spellbooks.",
};

export default function ReferencePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Reference</h1>
      <p className="mt-2 text-foreground-muted">
        Racials and race/class rules are also browsable inline as part of the{" "}
        <Link href="/planner" className="text-accent hover:underline">
          planner
        </Link>
        .
      </p>

      <div className="mt-6 grid gap-3">
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
          description="Every trainer-taught spell a level 38 character had in the BlizzCon 2026 demo, one collapsible section per class, plus new baseline abilities inferred from talent tooltips."
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
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GearFromUrl from "@/components/gear/GearFromUrl";
import { GEAR_PLANNER_CLASSES, DEFAULT_GEAR_LEVEL } from "@/lib/gear-config";
import { CLASS_COLOR, classLabel } from "@/lib/wow-data";

// One prerendered page per class with a pool. ?g= (the gear code) is read
// client-side in GearFromUrl, never here, so the page stays static (the
// planner and raid comp rule). The item pool, presets and base stats come
// from public/gear/<level>/<class>.json, fetched by the client.
export const dynamicParams = false;
export function generateStaticParams() {
  return GEAR_PLANNER_CLASSES.map((classId) => ({ classId }));
}

const isPlannerClass = (id: string): id is (typeof GEAR_PLANNER_CLASSES)[number] => (GEAR_PLANNER_CLASSES as readonly string[]).includes(id);

export async function generateMetadata({ params }: { params: Promise<{ classId: string }> }): Promise<Metadata> {
  const { classId } = await params;
  if (!isPlannerClass(classId)) return {};
  const name = classLabel(classId);
  const description = `Plan a level ${DEFAULT_GEAR_LEVEL} ${name} gear set for World of Warcraft: Forever: start from a generated preset, swap items, random-suffix rolls and enchants, and share it with a link.`;
  return {
    title: `WoW Forever ${name} Gear Planner (Level ${DEFAULT_GEAR_LEVEL})`,
    description,
    alternates: { canonical: `/gear/${classId}` },
    openGraph: { title: `${name} Gear Planner | Forevercraft`, description, url: `/gear/${classId}`, siteName: "Forevercraft", type: "website" },
  };
}

export default async function GearPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  if (!isPlannerClass(classId)) notFound();
  const name = classLabel(classId);
  // Rendered on the server and kept in the DOM by the "?" dialog, so it's in the prerendered HTML.
  const howTo = (
    <>
      <p>
        Pick a preset to start from: each is a generated level {DEFAULT_GEAR_LEVEL} {name} set for one role, built from
        stat weights plus a few hand corrections. Switch Alliance or Horde, since faction quest rewards differ, and pick a
        race to see its base stats.
      </p>
      <p>
        Tap any slot to swap its item. The list starts with the preset&apos;s suggestions; type to search every item your
        class can use from level 20 to {DEFAULT_GEAR_LEVEL}. Hover an item (or read the numbers under it on a phone) to
        see how your stats would change. Choose a random-suffix roll and an enchant on the slot itself.
      </p>
      <p>
        The address bar always holds a link to what&apos;s on screen: share it, or save the set to this browser. Stats
        are gear plus race base stats at level {DEFAULT_GEAR_LEVEL}, with no buffs or talents.
      </p>
    </>
  );
  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4">
      <h1 className="font-heading text-2xl font-semibold tracking-wide" style={{ color: CLASS_COLOR[classId] }}>
        {name} Gear Planner
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Level {DEFAULT_GEAR_LEVEL} gear sets for World of Warcraft: Forever, from a preset or from scratch.
      </p>
      <GearFromUrl classId={classId} className={name} help={howTo} />
    </main>
  );
}

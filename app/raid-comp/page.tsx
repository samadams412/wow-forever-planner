import type { Metadata } from "next";
import RaidCompFromUrl from "@/components/raid-comp/RaidCompFromUrl";
import { SPECS, type SpecView } from "@/lib/raid-comp";
import { getRaidEffectSets, getRaidEffects } from "@/lib/raid-buffs";
import { SITE_URL } from "@/lib/site";
import { CLASS_COLOR, classLabel, getTreeIcon, mediumIconUrl } from "@/lib/wow-data";

const DESCRIPTION =
  "Plan a 10, 20 or 40-player World of Warcraft: Forever raid by spec, see which raid buffs and debuffs your roster covers, and share it with a link.";

// Same title/description/canonical for every ?r=&n=&s= shared roster, so
// ranking consolidates on /raid-comp (the planner does the same).
export const metadata: Metadata = {
  title: "WoW Forever Raid Comp Planner — Buff & Debuff Coverage",
  description: DESCRIPTION,
  alternates: { canonical: "/raid-comp" },
  openGraph: {
    title: "Raid Comp Planner | Forevercraft",
    description: DESCRIPTION,
    url: "/raid-comp",
    siteName: "Forevercraft",
    type: "website",
  },
};

const WEB_APPLICATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Forevercraft Raid Comp Planner",
  applicationCategory: "GameApplication",
  operatingSystem: "Any (web browser)",
  url: `${SITE_URL}/raid-comp`,
  description: DESCRIPTION,
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RaidCompPage() {
  const specs: SpecView[] = SPECS.map((s) => ({
    ...s,
    className: classLabel(s.classId),
    label: `${s.tree} ${classLabel(s.classId)}`,
    color: CLASS_COLOR[s.classId],
    icon: mediumIconUrl(getTreeIcon(s.classId, s.tree)),
  }));

  const sets = getRaidEffectSets();

  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEB_APPLICATION_JSON_LD) }} />
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Raid Comp Planner</h1>
      <div className="mt-2 max-w-[72ch] space-y-1.5 text-sm leading-relaxed text-foreground-muted">
        <p>
          Build a World of Warcraft: Forever raid roster group by group, for 10, 20 or 40 players. As you add specs, the
          coverage list shows which raid buffs, group buffs and boss debuffs your roster brings, how many players can
          provide each one, and where a class is spread too thin, like one Paladin for four Blessings.
        </p>
        <p>
          Tap a spec, then tap slots to place it; on desktop you can also drag specs and players around. Add names, save
          the roster to this browser, or share it: the link in your address bar always matches what&apos;s on screen. Buff
          text comes from the current Forever beta.
        </p>
      </div>
      <RaidCompFromUrl
        specs={specs}
        effects={getRaidEffects()}
        onlyOneCounts={sets.onlyOneCounts}
        perCaster={sets.perCaster}
        build={sets.build}
      />
    </main>
  );
}

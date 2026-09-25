import type { Metadata } from "next";
import Collapsible from "@/components/site/Collapsible";
import InGameSection from "@/components/whats-new/InGameSection";
import WhatsNewView from "@/components/whats-new/WhatsNewView";
import { getAllDiffSummaries } from "@/lib/whats-new";
import SiteChangelog from "@/components/whats-new/SiteChangelog";
import WhatsNewTabs from "@/components/whats-new/WhatsNewTabs";
import { getPatchBuilds, getSiteChangelog } from "@/lib/patch-notes";

export const metadata: Metadata = {
  title: "What's New",
  description:
    "What changed in each WoW Forever beta build, class by class, with before and after numbers and Blizzard's developer notes.",
};

export default function WhatsNewPage() {
  const builds = getPatchBuilds();
  const changelog = getSiteChangelog();
  const syncs = getAllDiffSummaries();
  const latestSync = syncs[syncs.length - 1];

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-4">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">What&apos;s New</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        What changed in the WoW Forever beta, and what changed on this site. In Game covers each beta
        build class by class; hover a talent or spell to read its current text.
      </p>

      <div className="mt-5">
        <WhatsNewTabs
          inGame={
            <InGameSection builds={builds}>
              {latestSync && (
                <Collapsible
                  title="Talent data syncs (raw)"
                  subtitle="Field-level talent changes between our own data pulls from the beta client, newest first"
                >
                  <WhatsNewView latest={latestSync} history={syncs.slice(0, -1)} />
                </Collapsible>
              )}
            </InGameSection>
          }
          onSite={<SiteChangelog entries={changelog} />}
        />
      </div>
    </main>
  );
}

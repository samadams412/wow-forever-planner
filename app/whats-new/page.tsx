import type { Metadata } from "next";
import WhatsNewView from "@/components/whats-new/WhatsNewView";
import { getAllDiffSummaries } from "@/lib/whats-new";

export const metadata: Metadata = {
  title: "What's New",
  description: "Talent changes from the latest WoW Forever beta data sync, class by class.",
};

export default function WhatsNewPage() {
  const all = getAllDiffSummaries();
  const latest = all[all.length - 1];
  const history = all.slice(0, -1);

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-4">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">What&apos;s New</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        Talent data changes pulled from the WoW Forever beta client, synced from talentsforever.com and
        applied to our own data files. This tracks game data changes, not our own site&apos;s UI updates.
      </p>

      {latest ? (
        <div className="mt-5">
          <WhatsNewView latest={latest} history={history} />
        </div>
      ) : (
        <p className="mt-5 text-sm text-foreground-muted">No data syncs recorded yet.</p>
      )}
    </main>
  );
}

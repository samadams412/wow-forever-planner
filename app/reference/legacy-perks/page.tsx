import type { Metadata } from "next";
import BackToReferences from "@/components/reference/BackToReferences";
import LegacyPerksReference from "@/components/reference/LegacyPerksReference";

export const metadata: Metadata = {
  title: "Legacy System Perks & Rewards Reference",
  description:
    "Every known Legacy Perk across the Adventure, Resourcefulness, and Professions trees, plus confirmed Legacy Point caps and cosmetic reward items for World of Warcraft: Forever.",
};

export default function LegacyPerksPage() {
  return (
    <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4">
      <BackToReferences />
      <LegacyPerksReference />
    </main>
  );
}

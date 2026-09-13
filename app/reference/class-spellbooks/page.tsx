import type { Metadata } from "next";
import BackToReferences from "@/components/reference/BackToReferences";
import ClassSpellbooksReference from "@/components/reference/ClassSpellbooksReference";

export const metadata: Metadata = {
  title: "Class Spellbooks at Level 38 Reference",
  description:
    "Every trainer-taught spell each class had at level 38 in the BlizzCon 2026 World of Warcraft: Forever demo, read frame by frame from stream footage.",
};

export default function ClassSpellbooksPage() {
  return (
    <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4">
      <BackToReferences />
      <ClassSpellbooksReference />
    </main>
  );
}

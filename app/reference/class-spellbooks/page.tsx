import type { Metadata } from "next";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import ClassSpellbooksReference from "@/components/reference/ClassSpellbooksReference";

export const metadata: Metadata = {
  title: "Class Spellbooks Reference",
  description:
    "Every trainer-taught spell for each class, every rank and level, read straight from the WoW Forever beta client's own files.",
};

export default function ClassSpellbooksPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4">
      <Breadcrumbs items={[{ label: "Reference", href: "/reference" }, { label: "Class Spellbooks" }]} />
      <ClassSpellbooksReference />
    </main>
  );
}

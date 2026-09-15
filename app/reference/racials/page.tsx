import type { Metadata } from "next";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import RacialsReference from "@/components/reference/RacialsReference";

export const metadata: Metadata = {
  title: "Race & Racial Ability Reference",
  description:
    "Every World of Warcraft: Forever race's allowed classes and racial abilities, Horde and Alliance side by side.",
};

export default function RacialsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4">
      <Breadcrumbs items={[{ label: "Reference", href: "/reference" }, { label: "Racials" }]} />
      <RacialsReference />
    </main>
  );
}

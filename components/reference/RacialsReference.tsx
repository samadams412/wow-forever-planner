import { races } from "@/lib/wow-data";
import RaceReferenceTable from "./RaceReferenceTable";

export default function RacialsReference() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Racials</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        Every race's allowed classes and racial abilities, Horde and Alliance side by side -- the
        same reference shown beside the talent tree in the planner.
      </p>

      <div className="mt-6">
        <RaceReferenceTable races={races} />
      </div>
    </div>
  );
}

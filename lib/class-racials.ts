import classRacialsData from "@/data/class-racials.json";

export type ClassRacialSpell = {
  name: string;
  tag?: "new" | "changed";
  meta?: string;
  description: string;
  classicNote?: string;
  icon: string;
};

export type ClassRacials = {
  note: string;
  source: string;
  races: Record<string, ClassRacialSpell[]>;
};

const CLASS_RACIALS = classRacialsData as Record<string, ClassRacials>;

export function getClassRacials(classId: string): ClassRacials | undefined {
  return CLASS_RACIALS[classId.charAt(0).toUpperCase() + classId.slice(1)];
}

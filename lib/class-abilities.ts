import classAbilitiesData from "@/data/class-abilities.json";

export type ClassAbility = {
  name: string;
  description: string;
  icon: string;
};

export type ClassAbilities = {
  abilities: ClassAbility[];
};

const CLASS_ABILITIES = classAbilitiesData as Record<string, ClassAbilities>;

export function getClassAbilities(classId: string): ClassAbilities | undefined {
  return CLASS_ABILITIES[classId.charAt(0).toUpperCase() + classId.slice(1)];
}

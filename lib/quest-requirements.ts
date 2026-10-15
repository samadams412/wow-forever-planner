// Display and URL helpers for quest class/race/profession requirements. Kept
// apart from lib/quests.ts so client components can import them without
// pulling in the quest index JSON.

type QuestRequirements = {
  requiredClasses: string[] | null;
  requiredRaces: string[] | null;
  requiredProfession: { name: string; skill: number | null } | null;
};

// URL value for a class/race/profession name: "Night Elf" -> "night-elf".
export function requirementSlug(name: string): string {
  return name.toLowerCase().replace(/ /g, "-");
}

const HORDE_RACES = ["Orc", "Undead", "Tauren", "Troll"];
const ALLIANCE_RACES = ["Human", "Dwarf", "Night Elf", "Gnome"];

// Display text for the requirement columns. "--" = no restriction (or no data).
export function formatRequiredClasses(quest: QuestRequirements): string {
  return quest.requiredClasses?.join(", ") ?? "--";
}

export function formatRequiredRaces(quest: QuestRequirements): string {
  const races = quest.requiredRaces;
  if (!races) return "--";
  // A whole faction's race mask is how cMaNGOS encodes a faction-only quest.
  const key = races.join();
  if (key === HORDE_RACES.join()) return "All Horde";
  if (key === ALLIANCE_RACES.join()) return "All Alliance";
  return races.join(", ");
}

export function formatRequiredProfession(quest: QuestRequirements): string {
  const p = quest.requiredProfession;
  if (!p) return "--";
  return p.skill ? `${p.name} (${p.skill})` : p.name;
}

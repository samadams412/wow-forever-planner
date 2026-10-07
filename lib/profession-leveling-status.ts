// Which professions have a Leveling 1 to 300 path that has been tested and
// is ready to be treated as final. Every other profession still shows its
// leveling data (it's catalog data, reachable on its own tab), but grayed
// out under an "under construction" overlay that blocks interaction with it
// (components/professions/LevelingUnderConstruction.tsx). Add an id here only
// once that path has been checked and is ready for players.
//
// Client-safe on purpose (no Node built-ins): ProfessionExplorer is a client
// component and imports this too.
export const LEVELING_VERIFIED_PROFESSION_IDS: readonly string[] = ["blacksmithing", "first-aid"];

export function isLevelingVerified(professionId: string): boolean {
  return LEVELING_VERIFIED_PROFESSION_IDS.includes(professionId);
}

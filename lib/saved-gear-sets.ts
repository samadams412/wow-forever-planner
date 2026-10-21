// Gear sets saved to this browser, same pattern as lib/saved-rosters.ts (one
// JSON array under one key, newest first, every access in try/catch). Local
// only: no tracking events. A set is stored as its share code (lib/gear-code.ts)
// so loading goes through the same versioned, validating decoder as a link.
export type SavedGearSet = {
  id: string;
  classId: string;
  name: string;
  code: string;
  race: string;
  createdAt: number;
};

const STORAGE_KEY = "forevercraft:saved-gear-sets";

function readAll(): SavedGearSet[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(sets: SavedGearSet[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
    return true;
  } catch {
    // Storage unavailable (private browsing, quota exceeded, disabled, etc).
    return false;
  }
}

export function getSavedGearSets(classId: string): SavedGearSet[] {
  return readAll()
    .filter((s) => s.classId === classId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function saveGearSet(set: Omit<SavedGearSet, "id" | "createdAt">): SavedGearSet | null {
  const entry: SavedGearSet = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now(), ...set };
  const sets = readAll();
  sets.push(entry);
  return writeAll(sets) ? entry : null;
}

export function deleteSavedGearSet(id: string): boolean {
  return writeAll(readAll().filter((s) => s.id !== id));
}
